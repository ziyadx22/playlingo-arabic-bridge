import { mkdir, writeFile } from "node:fs/promises";

// TanStack Start emits a server app, not a standalone dist/index.html.
// Capacitor loads server.url; this local file is the online shell fallback.
await mkdir("dist", { recursive: true });
await writeFile(
  "dist/index.html",
  `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MZGTA</title></head>
<body><h1>MZGTA</h1><p>يلزم الاتصال بالإنترنت لفتح MZGTA.</p><a href="https://playlingo-arabic-bridge.lovable.app/">إعادة المحاولة</a></body></html>`,
);
console.log("Prepared Capacitor dist shell; native apps use the published HTTPS app.");
