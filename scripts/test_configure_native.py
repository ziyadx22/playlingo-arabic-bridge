import importlib.util
from pathlib import Path
import plistlib
import tempfile
import tarfile
import unittest
import unittest.mock
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
            self.assertTrue(result["NSLocalNetworkUsageDescription"])
            self.assertEqual(result["NSBonjourServices"], ["_ps4._udp", "_ps5._udp"])
            self.assertIs(result["MZGTAPS5Pairing"], True)

    def test_ios_plugin_sources_are_compiled_and_registered_idempotently(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            template = Path(__file__).resolve().parent.parent / "node_modules/@capacitor/cli/assets/ios-spm-template.tar.gz"
            with tarfile.open(template) as archive:
                for member in archive.getmembers():
                    if member.name.endswith("project.pbxproj") or member.name.endswith("Main.storyboard"):
                        destination = root / member.name.lstrip("./")
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        destination.write_bytes(archive.extractfile(member).read())
            native.configure_ios_plugin(root)
            project = root / "App/App.xcodeproj/project.pbxproj"
            first = project.read_text()
            native.configure_ios_plugin(root)
            self.assertEqual(first, project.read_text())
            self.assertIn("PS5RemotePlayPlugin.swift in Sources", first)
            self.assertIn("PS5RemotePlayPlugin.m in Sources", first)
            self.assertIn("regist.c in Sources", first)
            self.assertIn("CHIAKI_APPLE_CRYPTO=1", first)
            self.assertEqual(first.count("SWIFT_OBJC_BRIDGING_HEADER ="), 2)
            self.assertIn('customClass="MZGTABridgeViewController"', (root / "App/App/Base.lproj/Main.storyboard").read_text())
            with (root / "App/App/MZGTA.entitlements").open("rb") as file:
                self.assertTrue(plistlib.load(file)["com.apple.developer.networking.multicast"])

    def test_multicast_off_drops_only_the_multicast_entitlement(self):
        with tempfile.TemporaryDirectory() as tmp, unittest.mock.patch.dict(native.os.environ, {"MZGTA_MULTICAST": "0"}):
            root = Path(tmp)
            template = Path(__file__).resolve().parent.parent / "node_modules/@capacitor/cli/assets/ios-spm-template.tar.gz"
            with tarfile.open(template) as archive:
                for member in archive.getmembers():
                    if member.name.endswith(("project.pbxproj", "Main.storyboard", "App/Info.plist")):
                        destination = root / member.name.lstrip("./")
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        destination.write_bytes(archive.extractfile(member).read())
            native.configure_ios(root)
            native.configure_ios_plugin(root)
            with (root / "App/App/MZGTA.entitlements").open("rb") as file:
                entitlements = plistlib.load(file)
            self.assertNotIn("com.apple.developer.networking.multicast", entitlements)
            self.assertEqual(entitlements["com.apple.security.application-groups"], ["group.com.mzgta.app"])
            with (root / "App/App/Info.plist").open("rb") as file:
                self.assertIs(plistlib.load(file)["MZGTAPS5Pairing"], False)
            self.assertIn("PS5RemotePlayPlugin.swift in Sources", (root / "App/App.xcodeproj/project.pbxproj").read_text())
            self.assertTrue((root / "App/MZGTABroadcast/SampleHandler.swift").exists())


if __name__ == "__main__":
    unittest.main()