"""Verify actual Capacitor packaging without running the web build or Apple toolchain."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("prepare-capacitor.mjs").resolve()


class LocalIOSPackagingTests(unittest.TestCase):
    def test_copies_client_and_offline_pack_but_not_worker_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            client = root / "dist/client"
            (client / "assets").mkdir(parents=True)
            (client / "packs").mkdir()
            shell = '<html><script src="/assets/app.js"></script></html>'
            (client / "_shell.html").write_text(shell)
            (client / "assets/app.js").write_text("console.log('client')")
            (client / "packs/gaming-dictionary-v2.json").write_text('{"entryCount":87398}')
            (root / "dist/server").mkdir()
            (root / "dist/server/index.js").write_text("server-only")
            env = {**os.environ, "MZGTA_NATIVE_VIEW": "phone", "MZGTA_LOCAL_IOS": "1"}
            subprocess.run(["node", str(SCRIPT)], cwd=root, env=env, check=True, capture_output=True)
            local = root / "dist/native-ios"
            self.assertEqual((local / "index.html").read_text(), shell)
            self.assertEqual((local / "assets/app.js").read_bytes(), (client / "assets/app.js").read_bytes())
            self.assertEqual((local / "packs/gaming-dictionary-v2.json").read_bytes(),
                             (client / "packs/gaming-dictionary-v2.json").read_bytes())
            self.assertFalse((local / "server").exists())

    def test_refuses_to_package_an_online_fallback_as_local_ios(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = {**os.environ, "MZGTA_NATIVE_VIEW": "phone", "MZGTA_LOCAL_IOS": "0"}
            result = subprocess.run(["node", str(SCRIPT)], cwd=tmp, env=env, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((Path(tmp) / "dist/native-ios/index.html").exists())


if __name__ == "__main__":
    unittest.main()