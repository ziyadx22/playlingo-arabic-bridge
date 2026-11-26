"""Idempotent native configuration after cap add/sync. No signing credentials."""
import argparse
from pathlib import Path
import plistlib
import shutil
import xml.etree.ElementTree as ET

ANDROID = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ANDROID)


def android_attr(name):
    return f"{{{ANDROID}}}{name}"


def configure_android(root):
    manifest = root / "app/src/main/AndroidManifest.xml"
    tree = ET.parse(manifest)
    document = tree.getroot()
    app = document.find("application")
    if app is None:
        raise ValueError("Android manifest has no application")
    activity = next((a for a in app.findall("activity") if a.get(android_attr("name"), "").endswith("MainActivity")), None)
    if activity is None:
        raise ValueError("Android manifest has no MainActivity")
    launcher = next((f for f in activity.findall("intent-filter") if any(a.get(android_attr("name")) == "android.intent.action.MAIN" for a in f.findall("action"))), None)
    if launcher is None:
        raise ValueError("Android manifest has no MAIN intent filter")
    if not any(c.get(android_attr("name")) == "android.intent.category.LEANBACK_LAUNCHER" for c in launcher.findall("category")):
        ET.SubElement(launcher, "category", {android_attr("name"): "android.intent.category.LEANBACK_LAUNCHER"})
    for name in ["android.software.leanback", "android.hardware.touchscreen", "android.hardware.camera", "android.hardware.microphone"]:
        feature = next((f for f in document.findall("uses-feature") if f.get(android_attr("name")) == name), None)
        if feature is None:
            feature = ET.SubElement(document, "uses-feature", {android_attr("name"): name})
        feature.set(android_attr("required"), "false")
    app.set(android_attr("banner"), "@drawable/tv_banner")
    activity.set(android_attr("screenOrientation"), "landscape")
    ET.indent(tree, space="    ")
    tree.write(manifest, encoding="utf-8", xml_declaration=True)
    resources = root / "app/src/main/res/drawable"
    resources.mkdir(parents=True, exist_ok=True)
    icon = Path(__file__).resolve().parent.parent / "public/icons/mzgta-512.png"
    shutil.copyfile(icon, resources / "mzgta_icon.png")
    app.set(android_attr("icon"), "@drawable/mzgta_icon")
    app.set(android_attr("roundIcon"), "@drawable/mzgta_icon")
    tree.write(manifest, encoding="utf-8", xml_declaration=True)
    paths = [
        "M58,114V66L72,92L86,66V114",
        "M100,66H128L100,114H128",
        "M170,66H142V114H170V92H158",
        "M184,66H218M201,66V114",
        "M232,114L247,66L262,114M238,96H256",
    ]
    banner = '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="320dp" android:height="180dp" android:viewportWidth="320" android:viewportHeight="180">\n'
    banner += '<path android:fillColor="#060b19" android:pathData="M0,0H320V180H0Z"/>\n'
    for path in paths:
        banner += f'<path android:fillColor="@android:color/transparent" android:strokeColor="#2dd4bf" android:strokeWidth="5" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="{path}"/>\n'
    (resources / "tv_banner.xml").write_text(banner + "</vector>\n")


def configure_ios(root):
    path = root / "App/App/Info.plist"
    with path.open("rb") as file:
        info = plistlib.load(file)
    info["NSCameraUsageDescription"] = "MZGTA uses the camera to scan the TV pairing code and read game subtitles."
    info["NSMicrophoneUsageDescription"] = "MZGTA uses the microphone when you choose speech translation."
    info["NSSpeechRecognitionUsageDescription"] = "MZGTA converts spoken game dialogue into text for translation."
    with path.open("wb") as file:
        plistlib.dump(info, file)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("platform", choices=["ios", "android"])
    parser.add_argument("--root", type=Path)
    args = parser.parse_args()
    root = args.root or Path(args.platform)
    if args.platform == "android":
        configure_android(root)
    else:
        configure_ios(root)
    print(f"Configured {args.platform} native project")