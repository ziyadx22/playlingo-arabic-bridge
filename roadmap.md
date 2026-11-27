# Roadmap

- [x] Prepare local Capacitor iOS packaging and native transport; preserve Android TV, dictionary, ReplayKit and sync (packaging/transport tests pass; real browser translation reaches TV).
- [x] Verify local-network privacy description, pairing plugin registration and App Group preservation; keep TestFlight multicast off pending Apple approval.
- [ ] Generate the new local iOS SPA and signed IPA in Codemagic, then verify native plugins on an iPhone — needs Apple credentials and macOS build runner.
- [x] Always register the PS5 plugin in the iPhone app and allow manual-IP pairing when multicast is missing (tests and Swift parse pass).
- [ ] Rebuild the iPhone app in Codemagic and confirm "Native Bridge: Active ✅" and manual-IP pairing on a real iPhone/PS5 — needs a new build and hardware.
- [ ] Enable automatic PS5 discovery in signed TestFlight only after Apple approves Multicast Networking and profiles are regenerated — user has not obtained approval.

- [x] Real QR + live TV↔iPhone sync + mic speech-to-text + camera OCR translation
- [x] Rebrand to MZGTA ("MZGTA • TV OVERLAY") + MZGTA logo emblem
- [x] Remove costly visual effects and demonstration translations
- [x] Free live translation, efficient camera/screen OCR, and Remote Play setup guide
- [x] Reliable cross-device pairing and subtitle delivery; verify end to end
- [x] Redesign iPhone tabs, devices, five-step setup guide, and live controls
- [x] Download a real starter glossary to IndexedDB and reuse it in translation
- [x] Verify setup validation, storage, mobile layout, and phone-to-TV translation
- [x] Configure Capacitor and Codemagic iPhone / Android TV packaging
- [x] Validate native setup scripts and document unsigned iPhone installation limits
- [x] Expand indexed offline dictionary, phrase/morphology fallback, and online enrichment
- [x] Wire translation pack download and accurate installed-entry count
- [x] Add native iOS PS5 discovery and audited registration integration
- [x] Include GPL-compatible Remote Play source and licensing notices (approved)
- [x] Validate offline translation, native configuration, protocol crypto, and browser-to-TV flow
- [x] Audit copied native sources, verify Swift 5 syntax and C protocol tests, and add Apple-toolchain preflight checks
- [ ] Fix unsigned iOS Xcode compilation without removing dictionary, PS5 pairing, ReplayKit, translation, or TV sync features — final confirmation requires Codemagic
- [ ] Validate Xcode compilation and real PS5/iPhone discovery/registration — requires macOS/iOS SDK, physical hardware and multicast-enabled signing
- [ ] Verify the MZGTA Subtitles screen-broadcast extension on a real iPhone with PS Remote Play (needs signing with App Group group.com.mzgta.app and device testing)
- [ ] Install the signed iPhone build (Codemagic `ios-testflight`, TestFlight) and test PS Remote Play subtitle capture → TV on a real iPhone/PS5 — needs paid Apple Developer account, App Group and appstore_credentials in Codemagic; multicast is not required for this capture-only test.
