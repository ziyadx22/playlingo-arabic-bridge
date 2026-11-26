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
- Browser PS5 setup remains an official Remote Play guide; iOS uses the registered Capacitor discovery/Chiaki registration plugin, and registration never implies an active PS5 stream.
- Never persist console PINs/account IDs in browser storage or expose/log registration keys; save keys only in device-bound iOS Keychain after successful protocol validation.
- Deduplicate session history by subtitle ID because reconnect handshakes replay the current subtitle.
- Native builds are generated online Capacitor shells loading the published HTTPS origin; keep server functions hosted and prepare a dist fallback rather than packaging Worker output as client assets.
- Generate native projects in CI, apply idempotent platform patches after sync, and keep signing credentials and generated native output out of source deliveries.
- Compile the pinned registration-only Chiaki source in the iOS App target with Apple crypto primitives; ship license/source notices and require physical-device verification plus multicast-enabled signing for UDP discovery.
