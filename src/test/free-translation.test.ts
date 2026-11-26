import { describe, expect, it, vi } from "vitest";
import { fetchFreeTranslation, translationChunks, translationInput } from "@/lib/free-translation";

describe("Free live English-to-Arabic translation", () => {
  it("requests real English input using the free en|ar service", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          responseStatus: 200,
          responseData: { translatedText: "اهزم الزعيم لإتمام هذه المهمة" },
        }),
      ),
    );
    expect(await fetchFreeTranslation("Defeat the Boss to finish this quest.", request)).toBe(
      "اهزم الزعيم لإتمام هذه المهمة",
    );
    const input = request.mock.calls[0]?.[0];
    expect(input).toBeInstanceOf(URL);
    if (!(input instanceof URL)) throw new Error("Missing provider URL");
    expect(input.origin).toBe("https://api.mymemory.translated.net");
    expect(input.searchParams.get("q")).toBe("Defeat the Boss to finish this quest.");
    expect(input.searchParams.get("langpair")).toBe("en|ar");
  });
  it("keeps queries within the provider's 500-byte limit without losing text", () => {
    const text = "Game subtitle 🎮 ".repeat(40);
    const chunks = translationChunks(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(text);
    for (const chunk of chunks)
      expect(new TextEncoder().encode(chunk).length).toBeLessThanOrEqual(500);
  });
  it("reports quota exhaustion instead of presenting it as a subtitle", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          responseStatus: 200,
          quotaFinished: true,
          responseData: { translatedText: "Limit reached" },
        }),
      ),
    );
    await expect(fetchFreeTranslation("Hello", request)).rejects.toThrow("quota");
  });
  it("accepts 600 characters and rejects longer submissions", () => {
    expect(translationInput.safeParse({ text: "a".repeat(600) }).success).toBe(true);
    expect(translationInput.safeParse({ text: "a".repeat(601) }).success).toBe(false);
  });
});
