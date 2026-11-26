"""Verify preflight coverage/failure propagation; this is not an Apple compiler."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent


class NativeIOSPreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.native = self.root / "ios/App/App/Native"
        shutil.copytree(ROOT / "ios-native-plugin", self.native)
        (self.native.parent / "App-Bridging-Header.h").write_text('#import "Native/MZGTA-Bridging-Header.h"\n')
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.log = self.root / "calls.jsonl"
        mock = self.bin / "xcrun"
        mock.write_text('''#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
with open(os.environ["CHECK_LOG"], "a") as log:
    log.write(json.dumps(args) + "\\n")
if "--show-sdk-path" in args:
    print("/fake Apple SDK")
if any(arg.endswith(os.environ.get("FAIL_SOURCE", "__none__")) for arg in args):
    sys.exit(1)
''')
        mock.chmod(0o755)

    def run_preflight(self, fail_source="__none__"):
        env = dict(os.environ, PATH=str(self.bin) + os.pathsep + os.environ["PATH"],
                   CHECK_LOG=str(self.log), FAIL_SOURCE=fail_source)
        return subprocess.run(["sh", str(ROOT / "scripts/check-native-ios.sh"), "ios"],
                              cwd=self.root, env=env, text=True, capture_output=True)

    def test_checks_every_swift_objc_c_unit_and_typechecks_bridge(self):
        result = self.run_preflight()
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line) for line in self.log.read_text().splitlines()]
        for source in self.native.rglob("*"):
            if source.suffix not in [".swift", ".m", ".c"]:
                continue
            relative = str(source.relative_to(self.root))
            matching = [call for call in calls if relative in call]
            self.assertEqual(len(matching), 1, relative)
            call = matching[0]
            self.assertIn("arm64-apple-ios15.0", call)
            if source.suffix == ".swift":
                self.assertEqual(call[call.index("-swift-version") + 1], "5")
            elif source.suffix == ".c":
                self.assertIn("-DCHIAKI_APPLE_CRYPTO=1", call)
        self.assertEqual(sum("-typecheck" in call and "-import-objc-header" in call for call in calls), 1)

    def test_stops_on_swift_compiler_failure(self):
        result = self.run_preflight("PS5RemotePlayPlugin.swift")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("preflight passed", result.stdout)

    def test_stops_on_c_compiler_failure(self):
        result = self.run_preflight("regist.c")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("preflight passed", result.stdout)


if __name__ == "__main__":
    unittest.main()