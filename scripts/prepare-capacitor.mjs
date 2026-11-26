import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

if (process.env["MZGTA_NATIVE_VIEW"] !== "tv") {
  if (process.env["MZGTA_LOCAL_IOS"] !== "1") {
    throw new Error("iOS requires MZGTA_LOCAL_IOS=1 during the web build and preparation.");
  }
  // TanStack SPA mode produces a hydration shell and the same client routes/assets.
  // Never copy dist/server (Worker code) into the native app.
  const shell = await readFile("dist/client/_shell.html", "utf8");
  if (!shell.includes("<script") || !shell.includes("<html")) {
    throw new Error("The generated iOS SPA shell is incomplete.");
  }
  await rm("dist/native-ios", { recursive: true, force: true });
  await cp("dist/client", "dist/native-ios", { recursive: true });
  await writeFile("dist/native-ios/index.html", shell);
  console.log("Prepared local iOS app, assets and offline packs in dist/native-ios.");
} else {
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
}
