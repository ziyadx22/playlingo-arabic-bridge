import type { CapacitorConfig } from "@capacitor/cli";

// Server functions stay on the published origin, not inside the native binary.
const view = process.env["MZGTA_NATIVE_VIEW"] === "tv" ? "tv" : "phone";

const config: CapacitorConfig = {
  appId: "com.mzgta.app",
  appName: "MZGTA",
  webDir: "dist",
  server: {
    url: `https://playlingo-arabic-bridge.lovable.app/?view=${view}`,
    cleartext: false,
  },
};

export default config;
