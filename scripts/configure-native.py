"""Idempotent native configuration after cap add/sync. No signing credentials."""
import argparse
from pathlib import Path
import plistlib
import shutil
import hashlib
import re
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
    info["NSLocalNetworkUsageDescription"] = "MZGTA discovers your PlayStation on Wi-Fi and registers Remote Play using the pairing PIN you enter."
    info["NSBonjourServices"] = sorted(set(info.get("NSBonjourServices", []) + ["_ps5._udp", "_ps4._udp"]))
    with path.open("wb") as file:
        plistlib.dump(info, file)


def configure_ios_plugin(root):
    """Install local source in the actual App target after Capacitor sync."""
    source = Path(__file__).resolve().parent.parent / "ios-native-plugin"
    destination = root / "App/App/Native"
    shutil.copytree(source, destination, dirs_exist_ok=True)
    project = root / "App/App.xcodeproj/project.pbxproj"
    text = project.read_text()
    files = sorted(p for p in destination.rglob("*") if p.suffix in [".swift", ".m", ".c"])
    references, builds, source_ids = [], [], []
    for file in files:
        relative = file.relative_to(root / "App").as_posix()
        file_id = hashlib.sha256(("mzgta-ref:" + relative).encode()).hexdigest()[:24].upper()
        build_id = hashlib.sha256(("mzgta-build:" + relative).encode()).hexdigest()[:24].upper()
        if file_id in text:
            continue
        kind = {".swift": "sourcecode.swift", ".m": "sourcecode.c.objc", ".c": "sourcecode.c.c"}[file.suffix]
        references.append(f'\t\t{file_id} /* {file.name} */ = {{isa = PBXFileReference; lastKnownFileType = {kind}; path = "{relative}"; sourceTree = SOURCE_ROOT; }};\n')
        flags = ' settings = {COMPILER_FLAGS = "-DCHIAKI_APPLE_CRYPTO=1"; };' if file.suffix == ".c" else ""
        builds.append(f'\t\t{build_id} /* {file.name} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_id};{flags} }};\n')
        source_ids.append(f'\t\t\t\t{build_id} /* {file.name} in Sources */,\n')
    if references:
        for marker, lines in [("/* End PBXFileReference section */", references), ("/* End PBXBuildFile section */", builds)]:
            if marker not in text:
                raise ValueError(f"Unsupported Xcode template: {marker}")
            text = text.replace(marker, "".join(lines) + marker, 1)
        pattern = r'(isa = PBXSourcesBuildPhase;\s*buildActionMask = \d+;\s*files = \(\s*)'
        text, count = re.subn(pattern, lambda m: m.group(1) + "".join(source_ids), text, count=1)
        if count != 1:
            raise ValueError("App sources build phase not found")
    if "MZGTA-Bridging-Header.h" not in text:
        text = text.replace('SWIFT_VERSION = 5.0;', '\n'.join([
            'SWIFT_VERSION = 5.0;',
            '\t\t\t\tSWIFT_OBJC_BRIDGING_HEADER = "App/Native/MZGTA-Bridging-Header.h";',
            '\t\t\t\tHEADER_SEARCH_PATHS = ("$(inherited)", "$(SRCROOT)/App/Native/chiaki/include");',
            '\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/MZGTA.entitlements;',
        ]))
        if "MZGTA-Bridging-Header.h" not in text:
            raise ValueError("App Swift build settings not found")
    project.write_text(text)
    storyboard = root / "App/App/Base.lproj/Main.storyboard"
    xml = storyboard.read_text().replace('customClass="CAPBridgeViewController" customModule="Capacitor"', 'customClass="MZGTABridgeViewController" customModule="App" customModuleProvider="target"')
    storyboard.write_text(xml)
    with (root / "App/App/MZGTA.entitlements").open("wb") as file:
        plistlib.dump({"com.apple.developer.networking.multicast": True, "com.apple.security.application-groups": ["group.com.mzgta.app"]}, file)
    # The ReplayKit extension lives beside the App target; add-broadcast-extension.rb creates its target.
    shutil.copytree(Path(__file__).resolve().parent.parent / "ios-broadcast-extension", root / "App/MZGTABroadcast", dirs_exist_ok=True)


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
        configure_ios_plugin(root)
    print(f"Configured {args.platform} native project")