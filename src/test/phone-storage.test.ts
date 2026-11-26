import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consoleAddress,
  downloadStarterPack,
  loadStarterPack,
  lookupPack,
  pairingPin,
} from "@/lib/phone-storage";
import { changeRoi } from "@/components/sard/roi";

afterEach(() => vi.unstubAllGlobals());

describe("Phone setup", () => {
  it("requires exactly eight numeric digits for the PS5 pairing guide", () => {
    expect(pairingPin.safeParse("12345678").success).toBe(true);
    for (const value of ["123456", "1234567", "123456789", "1234abcd"])
      expect(pairingPin.safeParse(value).success).toBe(false);
  });
  it("accepts a manual console IP and rejects invalid addresses", () => {
    expect(consoleAddress.safeParse("192.168.0.192").success).toBe(true);
    expect(consoleAddress.safeParse("192.168.0.999").success).toBe(false);
    expect(consoleAddress.safeParse("PS5-337").success).toBe(false);
  });
});

describe("Local translation pack", () => {
  it("downloads real entries, commits them to IndexedDB, and uses exact matches", async () => {
    const pack = {
      id: "gaming-starter-v1",
      name: "قاموس الألعاب",
      entries: [
        { en: "Quest", ar: "مهمة" },
        { en: "Boss", ar: "زعيم" },
        { en: "Checkpoint", ar: "نقطة حفظ" },
        { en: "Lore", ar: "أساطير العالم" },
      ],
    };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(pack)));
    vi.stubGlobal("fetch", fetcher);
    const progress: number[] = [];
    await downloadStarterPack((value) => progress.push(value));
    expect(fetcher).toHaveBeenCalledWith("/packs/gaming-starter-v1.json", {});
    expect(await loadStarterPack()).toEqual(pack);
    expect(progress.at(-1)).toBe(100);
    expect(lookupPack(await loadStarterPack(), "Quest.")).toBe("مهمة");
    expect(lookupPack(await loadStarterPack(), "Defeat the Boss")).toBeUndefined();
  });
  it("does not report completion when downloading fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("failure", { status: 503 })));
    const progress: number[] = [];
    await expect(downloadStarterPack((value) => progress.push(value))).rejects.toThrow("download");
    expect(progress).not.toContain(100);
  });
});

describe("Second reading region", () => {
  it("can be moved and resized without escaping the frame", () => {
    const region = { x: 8, y: 12, w: 84, h: 20 };
    expect(changeRoi(region, "move", 500, -500)).toEqual({ x: 16, y: 0, w: 84, h: 20 });
    expect(changeRoi(region, "resize", 500, 500)).toEqual({ x: 8, y: 12, w: 92, h: 88 });
  });
});
