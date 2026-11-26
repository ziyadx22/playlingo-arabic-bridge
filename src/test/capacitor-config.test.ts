import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Native build identity", () => {
  it("uses the requested application ID", async () => {
    const { default: config } = await import("../../capacitor.config");
    expect(config.appId).toBe("com.mzgta.app");
  });
  it("uses MZGTA as the native application name", async () => {
    const { default: config } = await import("../../capacitor.config");
    expect(config.appName).toBe("MZGTA");
  });
  it("uses dist as the Capacitor web directory", async () => {
    const { default: config } = await import("../../capacitor.config");
    expect(config.webDir).toBe("dist");
  });
  it("opens the phone view in the iPhone workflow", async () => {
    vi.stubEnv("MZGTA_NATIVE_VIEW", "phone");
    const { default: config } = await import("../../capacitor.config");
    expect(config.server?.url).toBe("https://playlingo-arabic-bridge.lovable.app/?view=phone");
    expect(config.server?.cleartext).toBe(false);
  });
  it("opens the TV view in the Android TV workflow", async () => {
    vi.stubEnv("MZGTA_NATIVE_VIEW", "tv");
    const { default: config } = await import("../../capacitor.config");
    expect(config.server?.url).toBe("https://playlingo-arabic-bridge.lovable.app/?view=tv");
  });
});
