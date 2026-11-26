import importlib.util
from pathlib import Path
import plistlib
import tempfile
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location("configure_native", Path(__file__).with_name("configure-native.py"))
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


class NativeConfigurationTests(unittest.TestCase):
    def test_android_tv_launcher_and_banner_are_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = root / "app/src/main/AndroidManifest.xml"
            manifest.parent.mkdir(parents=True)
            manifest.write_text('''<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application><activity android:name=".MainActivity"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>''')
            native.configure_android(root)
            native.configure_android(root)
            document = ET.parse(manifest).getroot()
            names = [c.get(native.android_attr("name")) for c in document.findall(".//category")]
            self.assertEqual(names.count("android.intent.category.LEANBACK_LAUNCHER"), 1)
            self.assertIn("android.intent.category.LAUNCHER", names)
            for name in ["android.software.leanback", "android.hardware.touchscreen"]:
                features = [f for f in document.findall("uses-feature") if f.get(native.android_attr("name")) == name]
                self.assertEqual(len(features), 1)
                self.assertEqual(features[0].get(native.android_attr("required")), "false")
            self.assertEqual(document.find("application").get(native.android_attr("banner")), "@drawable/tv_banner")
            ET.parse(root / "app/src/main/res/drawable/tv_banner.xml")

    def test_ios_adds_privacy_descriptions_without_overwriting_app_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            info = root / "App/App/Info.plist"
            info.parent.mkdir(parents=True)
            with info.open("wb") as file:
                plistlib.dump({"CFBundleDisplayName": "MZGTA"}, file)
            native.configure_ios(root)
            with info.open("rb") as file:
                result = plistlib.load(file)
            self.assertEqual(result["CFBundleDisplayName"], "MZGTA")
            for name in ["NSCameraUsageDescription", "NSMicrophoneUsageDescription", "NSSpeechRecognitionUsageDescription"]:
                self.assertTrue(result[name])


if __name__ == "__main__":
    unittest.main()