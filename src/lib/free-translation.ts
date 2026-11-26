import { z } from "zod";

export const translationInput = z.object({ text: z.string().trim().min(1).max(600) });
const responseSchema = z.object({
  responseStatus: z.union([z.number(), z.string()]),
  quotaFinished: z.boolean().optional(),
  responseData: z.object({ translatedText: z.string() }).optional(),
});

/** MyMemory limits each query to 500 UTF-8 bytes; leave a safety margin. */
export function translationChunks(text: string): string[] {
  const chunks: string[] = [];
  let chunk = "";
  for (const char of text) {
    if (new TextEncoder().encode(chunk + char).length > 450) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += char;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export async function fetchFreeTranslation(text: string, request: typeof fetch = fetch) {
  const parts = await Promise.all(
    translationChunks(text).map(async (part) => {
      const url = new URL("https://api.mymemory.translated.net/get");
      url.searchParams.set("q", part);
      url.searchParams.set("langpair", "en|ar");
      const res = await request(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error("unavailable");
      const data = responseSchema.parse(await res.json());
      if (data.quotaFinished || Number(data.responseStatus) === 429) throw new Error("quota");
      const ar = data.responseData?.translatedText.trim();
      if (Number(data.responseStatus) !== 200 || !ar || !/[\u0600-\u06ff]/.test(ar))
        throw new Error("unavailable");
      return ar;
    }),
  );
  return parts.join(" ");
}
