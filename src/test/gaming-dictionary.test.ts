import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DICTIONARY_MIN_ENTRIES } from "@/data/gamingDictionary";
import {
  downloadGamingDictionary,
  loadDictionarySummary,
  loadGamingDictionary,
  type DictionaryProgress,
} from "@/lib/gaming-dictionary-storage";
const raw = readFileSync("public/packs/gaming-dictionary-v2.json", "utf8");
const pack: { entryCount: number; entries: { en: string; ar: string }[] } = JSON.parse(raw);
afterEach(() => vi.unstubAllGlobals());
describe("Expanded dictionary storage", () => {
  it("ships at least 30,000 unique real English–Arabic entries", () => {
    expect(DICTIONARY_MIN_ENTRIES).toBe(30_000);
    expect(pack.entryCount).toBeGreaterThanOrEqual(30_000);
    expect(new Set(pack.entries.map((e) => e.en)).size).toBe(pack.entryCount);
    expect(pack.entries.every((e) => /[\u0600-\u06ff]/.test(e.ar))).toBe(true);
    expect(pack.entries.find((e) => e.en === "dragon")?.ar).toBeTruthy();
  });
  it("indexes the complete pack and reports ready only after committed storage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(raw)));
    const progress: DictionaryProgress[] = [];
    const saved = await downloadGamingDictionary((p) => progress.push(p));
    expect(saved.count).toBe(pack.entryCount);
    expect(await loadDictionarySummary()).toEqual(saved);
    const terms = await loadGamingDictionary();
    expect(terms.get("boss fight")).toBe("قتال الزعيم");
    expect(terms.get("dragon")).toBe("تنين");
    expect(progress.at(-1)).toMatchObject({
      percent: 100,
      indexed: pack.entryCount,
      phase: "ready",
    });
    expect(progress.slice(0, -1).every((p) => p.percent < 100)).toBe(true);
  }, 30000);
  it("rejects a falsely inflated count rather than reporting a successful download", async () => {
    const malformed = { ...JSON.parse(raw), entryCount: pack.entryCount + 1 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(malformed))));
    const progress: DictionaryProgress[] = [];
    await expect(downloadGamingDictionary((p) => progress.push(p))).rejects.toThrow("entry-count");
    expect(progress.some((p) => p.phase === "ready")).toBe(false);
  });
});
