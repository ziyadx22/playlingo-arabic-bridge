import { describe, expect, it } from "vitest";
import { captureConfig, captureState, REGION_PRESETS } from "@/lib/remote-play-capture";

describe("remote play capture", () => {
  it("is live only with a recent frame heartbeat", () => {
    expect(captureState({ active: true, heartbeat: 100 }, 103)).toBe("live");
    expect(captureState({ active: true, heartbeat: 100 }, 110)).toBe("waiting");
    expect(captureState({ active: false }, 103)).toBe("stopped");
  });
  it("requires the 6-digit TV room and HTTPS endpoints", () => {
    const base = { apiBase: "https://a.app", realtimeUrl: "https://r.co", anonKey: "k", regions: [REGION_PRESETS.bottom] };
    expect(captureConfig.safeParse({ ...base, room: "123456" }).success).toBe(true);
    expect(captureConfig.safeParse({ ...base, room: "12345" }).success).toBe(false);
    expect(captureConfig.safeParse({ ...base, room: "123456", apiBase: "http://a.app" }).success).toBe(false);
  });
});
