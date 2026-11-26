import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getManifest } from "workbox-build";
import { describe, expect, it } from "vitest";

describe("PWA precache", () => {
  it("excludes bulk dictionary and source downloads while retaining app icons", async () => {
    const config = readFileSync(resolve("vite.config.ts"), "utf8");
    const patterns = config.match(/globPatterns:\s*(\[[^\]]*\])/);
    const ignores = config.match(/globIgnores:\s*(\[[^\]]*\])/);
    if (!patterns?.[1] || !ignores?.[1]) {
      throw new Error("PWA precache patterns and exclusions must be configured");
    }
    const { manifestEntries, warnings } = await getManifest({
      globDirectory: resolve("public"),
      globPatterns: JSON.parse(patterns[1]) as string[],
      globIgnores: JSON.parse(ignores[1]) as string[],
    });
    const urls = manifestEntries.map((entry) => entry.url);
    expect(urls).toContain("icons/mzgta-192.png");
    expect(urls).toContain("manifest.json");
    expect(urls.some((url) => /(?:^|\/)(?:packs|licenses)\//.test(url))).toBe(false);
    expect(warnings).toEqual([]);
  });
});