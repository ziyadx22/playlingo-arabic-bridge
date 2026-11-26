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
| `android-apk` | `build/android/MZGTA-TV.apk` | Linux runner, Java 21, Android SDK 36, Android TV 7+ |

**Unsigned is not ad-hoc signed.** The IPA cannot be installed directly or
submitted to the App Store. Apple signing and a provisioning profile are required
for installation. Personal-device development signing may be possible with a
free Apple ID through Xcode or a re-signing tool, subject to Apple's restrictions;
ad-hoc distribution and App Store distribution require the paid developer program.

These are **online Capacitor shells**, not offline bundled copies of the full
app: TanStack Start's translation functions need a hosted server. `webDir` is
`dist`; `scripts/prepare-capacitor.mjs` creates the local fallback HTML after the
normal web build, and Capacitor loads the published HTTPS app (iPhone: `view=phone`,
TV: `view=tv`). Keep the published site available and publish web changes before
testing native builds. No private backend keys are embedded in the wrappers.

The Android workflow adds Leanback launcher support, a TV banner, optional
touchscreen/camera/microphone features, and landscape orientation. The iOS
workflow adds camera, microphone, and speech privacy descriptions. Actual camera,
speech availability, remote control navigation, and native installation must be
tested on physical devices; packaging does not provide PS5 Remote Play integration.

Local native preparation after `npm install`:

```sh
npm run build
node scripts/prepare-capacitor.mjs
npx cap add ios && npx cap sync ios
python3 scripts/configure-native.py ios
# Android TV, separately:
MZGTA_NATIVE_VIEW=tv npx cap add android
MZGTA_NATIVE_VIEW=tv npx cap sync android
python3 scripts/configure-native.py android
```

Validate native configuration helpers with:
`python3 -B -m unittest discover -s scripts -p 'test_*.py'`.
