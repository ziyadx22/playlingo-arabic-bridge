<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.

<!-- LOVABLE:END -->

- TV↔phone live sync uses Lovable Cloud realtime broadcast rooms keyed by the 6-digit PIN (src/lib/sync.ts), no tables — works across devices without storing data.
- Translation uses the free MyMemory API in a server function with bounded queries and timeout; browser-only OCR and QR libraries are lazy-loaded to avoid startup cost.
- Camera OCR reuses one worker and canvas, scans sequentially, and pauses in hidden tabs; translation caches are bounded to the current browser session to reduce repeated provider requests.
- Room pairing uses presence, retried handshakes, and buffered broadcast delivery; replay current TV settings and subtitles on a phone handshake to recover reconnects.
- PWA metadata and icons live in public/manifest.json and public/icons; the generated /sw.js is registered only by src/lib/pwa.ts, which blocks dev and Lovable preview hosts to prevent stale previews.
- Exclude packs and license/source downloads from Workbox precaching; dictionaries belong in on-demand IndexedDB storage so bulk downloads cannot break app-shell builds.
- Keep the phone navigation and setup guide separate from capture/translation controls, so navigation cannot misrepresent console connectivity.
- Download the independent licensed dictionary into version-keyed IndexedDB batches; expose ready metadata only after all entries commit and lazy-load its lookup map, keeping bulk vocabulary out of startup bundles.
- Translate exact gaming phrases locally, prefer cloud for composed sentences online, and mark unknown offline tokens explicitly; never claim universal coverage or full Arabic grammar from dictionary substitution.
- PS5 pairing selects only consoles that actually answered a discovery packet — broadcast search or a unicast probe to a user-typed IP (no IP-only success, no skipping the PIN for saved keys); success is shown only after Chiaki registration with the 8-digit PIN succeeds and keys are stored in Keychain. Registration never implies an active stream.
- Never persist console PINs/account IDs in browser storage or expose/log registration keys; save keys only in device-bound iOS Keychain after successful protocol validation.
- Deduplicate session history by subtitle ID because reconnect handshakes replay the current subtitle.
- iOS builds use TanStack SPA mode (MZGTA_LOCAL_IOS=1) and dist/native-ios without server.url; Android TV retains its online shell so its existing behavior stays unchanged.
- Local iOS translation uses CapacitorHttp with the existing hosted public endpoint, and ReplayKit receives the hosted HTTPS origin; Worker code must never be packaged as native client assets.
- Generate native projects in CI, apply idempotent platform patches after sync, and keep signing credentials and generated native output out of source deliveries.
- After iOS native copying, reconcile source/header references with xcodeproj by resolved path and configure the App bridging header in every target configuration; this ensures compilation without duplicate source entries.
- Pin the iOS workflow to Xcode 26.0 or newer (required by Capacitor 8) with Swift 5 language mode and run Apple SDK syntax/C/Objective-C/bridge checks before the full Xcode build; preserve xcresult diagnostics so compiler failures remain actionable.
- Compile the pinned registration-only Chiaki source in the iOS App target with Apple crypto primitives; ship license/source notices and require physical-device verification plus multicast-enabled signing for UDP discovery.
- PS5 subtitle capture runs in the iOS ReplayKit Broadcast Upload Extension (ios-broadcast-extension/, target added by scripts/add-broadcast-extension.rb): it OCRs the official PS Remote Play screen with Vision and posts Arabic to the existing TV room via HTTP broadcast, because the main app is suspended while Remote Play is in front.
- PlayStation status shown in the app comes only from the ReplayKit extension's reported capture status or a successful Chiaki registration; browsers can never advance the PS5 connect flow, so no screen implies a connection that did not happen.
- MZGTA_MULTICAST=0 (set per Codemagic workflow) drops only the multicast entitlement and sets Info.plist MZGTAPS5Discovery=false, disabling broadcast search only; the PS5 plugin is always registered (packageClassList plus bridge fallback) because unicast probe and Chiaki registration need only Local Network access.
- The ReplayKit extension target sets PRODUCT_NAME/WRAPPER_EXTENSION and a named MZGTABroadcast.appex product reference explicitly, because xcodeproj-created extension configs otherwise produce an unnamed .appex.
