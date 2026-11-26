import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureApiBase, HOSTED_APP_ORIGIN, translateForApp } from "@/lib/native-runtime";

const native = vi.hoisted(() => ({ platform: "web", enabled: false, post: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => native.platform, isNativePlatform: () => native.enabled },
  CapacitorHttp: { post: native.post },
}));

beforeEach(() => {
  vi.unstubAllGlobals();
  native.platform = "web";
  native.enabled = false;
  native.post.mockReset();
});

function localIos() {
  native.platform = "ios";
  native.enabled = true;
  vi.stubGlobal("window", {
    location: { protocol: "capacitor:", origin: "capacitor://localhost" },
  });
}

describe("Local native iOS transport", () => {
  it("keeps ReplayKit translation on the existing HTTPS service", () => {
    localIos();
    expect(captureApiBase()).toBe("https://playlingo-arabic-bridge.lovable.app");
  });
  it("uses native HTTP with the existing translation endpoint from local iOS", async () => {
    localIos();
    native.post.mockResolvedValue({ status: 200, data: { ar: "افتح الباب", error: null } });
    const webTranslate = vi.fn();
    expect(await translateForApp("Open the door", webTranslate)).toEqual({
      ar: "افتح الباب",
      error: null,
    });
    expect(native.post).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${HOSTED_APP_ORIGIN}/api/public/translate`,
        data: { text: "Open the door" },
      }),
    );
    expect(webTranslate).not.toHaveBeenCalled();
  });
  it("preserves the browser translation path", async () => {
    const browserTranslate = vi.fn().mockResolvedValue({ ar: "افتح الباب", error: null });
    await translateForApp("Open the door", browserTranslate);
    expect(browserTranslate).toHaveBeenCalledWith("Open the door");
    expect(native.post).not.toHaveBeenCalled();
  });
  it("never returns a translation on a failed native HTTP response", async () => {
    localIos();
    native.post.mockResolvedValue({ status: 502, data: { ar: "", error: "failed" } });
    const result = await translateForApp("Open the door", vi.fn());
    expect(result.ar).toBe("");
    expect(result.error).toBeTruthy();
  });
});
