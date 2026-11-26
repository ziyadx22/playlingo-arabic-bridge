# PlayStation connection audit

## The main blocker (outside the app code)
`codemagic.yaml` builds the iPhone app **unsigned** (`CODE_SIGNING_ALLOWED=NO`). An unsigned app:
- can't be installed on a normal iPhone, and
- loses its permissions. That means no Wi-Fi console search (multicast) and no shared space (App Group) between the app and the screen-capture extension.

So right now, none of the native PlayStation code can run on your phone. A paid Apple Developer account and a signed build are required.

## Real PlayStation logic (keep)
| File | What it really does |
|---|---|
| `ios-broadcast-extension/SampleHandler.swift` | ReplayKit extension. Reads English text on the iPhone screen (Sony's PS Remote Play app) with Apple Vision, translates it, sends the Arabic to your TV room |
| `ios-broadcast-extension/Info.plist`, `MZGTABroadcast.entitlements` | Extension setup |
| `ios-native-plugin/ScreenCapturePlugin.swift` | Opens the iOS "Start Broadcast" sheet, passes room/settings, reads status |
| `src/lib/remote-play-capture.ts` | App-side link to the plugin above |
| `src/routes/api/public/translate.ts` | Translation endpoint the extension calls (uses your existing engine) |
| `scripts/add-broadcast-extension.rb` | Adds the extension to the Xcode project |
| `ios-native-plugin/PS5RemotePlayPlugin.swift/.m/.h`, `ios-native-plugin/chiaki/src/*.c` | Wi-Fi console search + one-time PIN pairing (Chiaki). **No session, no video.** |
| `src/lib/ps5-remote-play.ts` | App-side link to the pairing plugin |

## Placeholder / non-functional parts
| File | Problem |
|---|---|
| `src/components/sard/PairingWizard.tsx` | Step 4 "hide connection message" and step 5 "sign in with your account" are just checkboxes. In a browser, steps 2–3 move forward without contacting anything, then "finish" |
| `src/components/sard/PhoneFlow.tsx` (PlayStation card only) | Shows "setup guide complete" / "registered" — this is not a Remote Play session status |
| `src/components/sard/RemotePlayCapture.tsx` | The 5-step checklist is manual ticks only. Status shows only alive/stopped, not what was read or sent |
| PSN authentication | **None exists.** It must stay that way: Sony's own app signs in, and MZGTA never asks for your password |

## Proposed change (SARD-style: PS Remote Play → read subtitles → translate → your TV)
**Modify**
1. `src/components/sard/PairingWizard.tsx`: remove the fake steps and the browser pass-through. Becomes: choose PS5 → one-time setup in Sony's app (secondary account, Remote Play) → **Connect** opens the real iOS broadcast sheet. In a browser it's disabled, with the reason shown.
2. `src/components/sard/PhoneFlow.tsx`: PlayStation card only. Its status is the real status from the extension: not running / waiting for frames / reading / last English line / last Arabic sent / error.
3. `src/components/sard/RemotePlayCapture.tsx`: merged into the flow above (the card is removed from the devices list).
4. `src/lib/remote-play-capture.ts`: add the new status fields.
5. `ios-broadcast-extension/SampleHandler.swift`: report the last English text, last Arabic text, the count of lines sent and errors to the app.
6. `codemagic.yaml`: **add** a new signed iPhone workflow (Codemagic automatic signing for `com.mzgta.app` + `com.mzgta.app.MZGTABroadcast`, App Group). The unsigned and Android TV workflows stay as they are.
7. `src/test/remote-play-capture.test.ts`, `AGENTS.md`, `roadmap.md`: matching updates.

**Optional remove** (Chiaki pairing has nothing to use it without a session/video player):
`ios-native-plugin/PS5RemotePlayPlugin.swift/.m/.h`, `ios-native-plugin/chiaki/`, `src/lib/ps5-remote-play.ts`, `src/test/ps5-remote-play.test.ts`, related lines in `MZGTABridgeViewController.swift`, `MZGTA-Bridging-Header.h`, `scripts/configure-native.py`, `scripts/check-native-ios.sh`, `scripts/test_remote_play_crypto.*`.

**Not touched:** `TvView.tsx`, `src/lib/sync.ts`, the translation engine files, the Android TV workflow, TV styling.

## Not possible in this architecture
A direct PS5 stream inside MZGTA would need Chiaki's full session, its network transport, video decoding (VideoToolbox), controller input and a PSN login page. That is a separate native player. It isn't covered by this change.
