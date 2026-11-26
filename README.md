# Playlingo Arabic Bridge

Build a complete, flagship PlayStation 5 & Smart TV Live Arabic Game Translation Platform ("SARD Pro" / "سرد برو") in RTL Arabic with a custom glowing futuristic SVG gaming logo, dark obsidian & neon cyan/violet glassmorphism UI, and two interactive views:

1. Smart TV Pairing & HDMI Overlay View:

   - Custom glowing geometric Arabic/gaming logo, animated dark mesh background, glowing QR pairing code + 6-digit PIN, and live connection badge.

   - Simulated 4K PS5 action game screen with a floating translucent frosted-glass Arabic subtitle bar at the bottom, smooth fade animations, and auto-hide toggle.

2. iPhone Companion & OCR Controller View:

   - Built-in Remote Play stream preview with a draggable Region-of-Interest (ROI) selection box over the English subtitle area.

   - Live OCR & Gaming AI Translation toggle (with gaming glossary: Quest, Boss, Checkpoint, Lore), instant Arabic subtitle preview card, 1-tap QR scanner button, sliders for TV font size, vertical position, glass opacity, neon text colors, and an AI Session Story Recap tab.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://playlingo-arabic-bridge.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/53e74cb1-51db-4d24-b884-0a82d0c66b50).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Native iPhone and Android TV builds (Codemagic)

Connect this GitHub repository to Codemagic, select configuration from
`codemagic.yaml`, then start `ios-ipa` or `android-apk`. The workflows generate
native projects each run; no Apple signing secrets are needed for the **unsigned**
iOS build, and Android uses Gradle's standard debug signing key.

| Workflow      | Artifact                     | Requirements                                         |
| ------------- | ---------------------------- | ---------------------------------------------------- |
| `ios-ipa`     | `build/ipa/MZGTA.ipa`        | macOS runner, latest Xcode, Node 22, iOS 15+         |
| `android-apk` | `build/android/MZGTA-TV.apk` | macOS runner, Java 21, Android SDK 36, Android TV 7+ |

**Unsigned is not ad-hoc signed.** The IPA cannot be installed directly or
submitted to the App Store. Apple signing and a provisioning profile are required
for installation. Personal-device development signing may be possible with a
free Apple ID through Xcode or a re-signing tool, subject to Apple's restrictions;
ad-hoc distribution and App Store distribution require the paid developer program.

**iOS loads locally from `capacitor://localhost`.** Its workflows set
`MZGTA_LOCAL_IOS=1` to generate a TanStack SPA shell; preparation copies only
`dist/client` (including the 87,398-entry dictionary pack) to `dist/native-ios`.
The iOS Capacitor configuration has no `server.url`. The default view is the phone.
Online translation uses Capacitor's native HTTP transport to the existing hosted
translation endpoint. ReplayKit still receives that same HTTPS service origin;
its capture logic, App Group and TV broadcast delivery are unchanged.
**Android TV remains an online shell** with `webDir=dist` and its existing
published `?view=tv` URL. Keep the published service available for online
translation and ReplayKit. No private backend keys are embedded in either app.

The Android workflow adds Leanback launcher support, a TV banner, optional
touchscreen/camera/microphone features, and landscape orientation. The iOS
workflow adds camera, microphone, and speech privacy descriptions. Actual camera,
speech availability, remote control navigation, and native installation must be
tested on physical devices. The iOS build includes PS5 discovery and registration,
not a Remote Play stream decoder. Browser mode still uses the official setup guide.

Local native preparation after `npm install`:

```sh
MZGTA_LOCAL_IOS=1 npm run build
MZGTA_NATIVE_VIEW=phone MZGTA_LOCAL_IOS=1 node scripts/prepare-capacitor.mjs
npx cap add ios && npx cap sync ios
python3 scripts/configure-native.py ios
# Android TV, separately:
MZGTA_NATIVE_VIEW=tv npm run build
MZGTA_NATIVE_VIEW=tv node scripts/prepare-capacitor.mjs
MZGTA_NATIVE_VIEW=tv npx cap add android
MZGTA_NATIVE_VIEW=tv npx cap sync android
python3 scripts/configure-native.py android
```

Validate native configuration helpers with:
`python3 -B -m unittest discover -s scripts -p 'test_*.py'`.

## Expanded offline dictionary

`scripts/build-gaming-dictionary.py` converts the checksum-pinned FreeDict / Arabeyes
English–Arabic 0.6.3 source into a separately licensed downloadable data pack.
It contains over 30,000 real general vocabulary entries, not 30,000 hand-reviewed
gaming sentences. Curated gaming overrides cover HUD, objectives, open world,
story, horror, Souls and RPG terminology. The UI reports the actual unique count.
Original source and GPL-2.0-or-later data license are served alongside the pack.
No proprietary game dialogue corpus is represented as included.

Downloads validate and index entries in batches, then commit ready metadata.
The engine uses longest-phrase matching, conservative inflection fallbacks and
limited adjective/noun ordering. Non-exact sentences prefer MyMemory when online.
Unknown offline words remain visibly marked; natural grammar and unlimited
coverage cannot be guaranteed. iOS starts from its local bundle and uses the
installed dictionary offline; cloud translation and TV delivery still need internet.

## Native PS5 discovery and registration

`ios-native-plugin/` includes Capacitor 8 Swift/Objective-C adapters and pinned
Chiaki/chiaki4deck v1.0.0 registration-only C source. Its actual license is
AGPL-3.0-only with an OpenSSL exception (GPL family); see NOTICE and COPYING.
Source distribution was approved. No cryptographic handshake is simulated.
Registration is encrypted HTTP on port 9295 using Chiaki's key derivation and
validated response, not an invented TLS endpoint. Keys remain in iOS Keychain;
only registration state and nickname cross the JavaScript bridge.

The native wizard needs the user's **base64-encoded eight-byte PSN account ID**,
not the PSN display name, password or a guessed ID. Enable Remote Play on PS5,
join the same Wi-Fi, grant Local Network access, select the actual discovered
console, and enter the current eight-digit PIN.
Discovery sends the PS5 UDP search on 9302 and PS4 search on 987. Network.framework
checks the Wi-Fi path; BSD sockets supply SO_BROADCAST, which NWConnection does
not expose. Bonjour declarations alone do not grant UDP broadcast permission.

**Signing prerequisite:** iOS broadcast requires Apple's multicast networking
entitlement in a signed provisioning profile. The helper creates the entitlement
file; an unsigned IPA cannot enable it. `NSLocalNetworkUsageDescription` is
configured in Info.plist, and the first native discovery attempt requests local
network access. Local Network permission and Apple's multicast entitlement are
separate requirements. The `ios-testflight` workflow retains `MZGTA_MULTICAST=0`
until Apple approves multicast; change it to `"1"` and regenerate App Store profiles
with the approved capability to expose PS5 discovery and PIN registration. Keep
App Group `group.com.mzgta.app` enabled for both existing bundle IDs
`com.mzgta.app` and `com.mzgta.app.MZGTABroadcast`. Codemagic still needs the
`appstore_credentials` group with `APP_STORE_CONNECT_ISSUER_ID`,
`APP_STORE_CONNECT_KEY_IDENTIFIER`, `APP_STORE_CONNECT_PRIVATE_KEY` and
`CERTIFICATE_PRIVATE_KEY`. Neither signing nor uploads are performed by these
local preparation changes. A physical PS5/iPhone and Xcode build are needed
to verify firmware compatibility; this environment cannot test either hardware.
Successful registration is shown as registered, never falsely as a live stream.

Run `sh scripts/test-remote-play-crypto.sh` on macOS to test the Apple crypto
adapter with upstream PS5 known-answer vectors; Codemagic runs this before
Xcode. Linux can test the same protocol tables with OpenSSL development headers.
Application/native source is distributed under AGPL-3.0-only (see LICENSE);
`python3 scripts/prepare-source-offer.py` creates the inspected source download
linked from the account screen. Both CI workflows refresh it before building.
