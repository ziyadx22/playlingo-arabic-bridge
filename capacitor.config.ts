import type { CapacitorConfig } from "@capacitor/cli";

// Android TV retains its working online shell. iOS loads a real local SPA bundle.
const view = process.env["MZGTA_NATIVE_VIEW"] === "tv" ? "tv" : "phone";

const config: CapacitorConfig = {
  appId: "com.mzgta.app",
  appName: "MZGTA",
  webDir: view === "tv" ? "dist" : "dist/native-ios",
  ...(view === "tv"
    ? {
        server: {
          url: `https://playlingo-arabic-bridge.lovable.app/?view=${view}`,
          cleartext: false,
        },
      }
    : {}),
};

export default config;
