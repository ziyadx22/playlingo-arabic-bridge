"""Exercise the actual Codemagic Ruby registration step against an Xcode template."""
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("configure_native", ROOT / "scripts/configure-native.py")
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)
RUBY = re.search(r"ruby <<'RUBY'\n(.*?)\n          RUBY", (ROOT / "codemagic.yaml").read_text(), re.S).group(1)
RUBY = "\n".join(line[10:] for line in RUBY.splitlines())


class CodemagicIOSRegistrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        template = ROOT / "node_modules/@capacitor/cli/assets/ios-spm-template.tar.gz"
        with tarfile.open(template) as archive:
            for member in archive.getmembers():
                if member.name.endswith(("project.pbxproj", "Main.storyboard", "AppDelegate.swift")):
                    destination = self.root / "ios" / member.name.lstrip("./")
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(archive.extractfile(member).read())
        native.configure_ios_plugin(self.root / "ios")
        # Also exercise a newly copied source not already registered by Python.
        (self.root / "ios/App/App/Native/Extra.swift").write_text("import Foundation\n")
        self.run_ruby(RUBY)

    def run_ruby(self, code):
        return subprocess.run(["ruby", "-"], input=code, text=True, cwd=self.root,
                              check=True, capture_output=True).stdout

    def inspect_project(self):
        return json.loads(self.run_ruby('''require "xcodeproj"
require "json"
p = Xcodeproj::Project.open("ios/App/App.xcodeproj")
t = p.targets.find { |item| item.name == "App" }
puts JSON.generate({sources: t.source_build_phase.files_references.map { |r| r.real_path.to_s },
  headers: t.build_configurations.map { |c| c.build_settings["SWIFT_OBJC_BRIDGING_HEADER"] },
  flags: t.source_build_phase.files.select { |f| f.file_ref.path.end_with?(".c") }.map { |f| f.settings["COMPILER_FLAGS"] }})
'''))

    def test_sources_registered_once_even_after_repeat_run(self):
        first = self.inspect_project()
        self.run_ruby(RUBY)
        self.assertEqual(first, self.inspect_project())
        sources = first["sources"]
        self.assertEqual(len(sources), len(set(sources)))
        for filename in ["PS5RemotePlayPlugin.swift", "PS5RemotePlayPlugin.m", "regist.c", "Extra.swift", "AppDelegate.swift"]:
            self.assertEqual(sum(path.endswith("/" + filename) for path in sources), 1)
        self.assertTrue(first["flags"])
        self.assertTrue(all("-DCHIAKI_APPLE_CRYPTO=1" in flags for flags in first["flags"]))

    def test_bridging_header_configured_in_every_build_configuration(self):
        project = self.inspect_project()
        self.assertGreaterEqual(len(project["headers"]), 2)
        self.assertTrue(all(header == "App/App-Bridging-Header.h" for header in project["headers"]))
        header = self.root / "ios/App/App/App-Bridging-Header.h"
        self.assertIn('#import "Native/MZGTA-Bridging-Header.h"', header.read_text())
        self.assertTrue((header.parent / "Native/MZGTA-Bridging-Header.h").is_file())


if __name__ == "__main__":
    unittest.main()