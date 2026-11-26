import { z } from "zod";

export const pairingPin = z.string().regex(/^\d{8}$/);
export const consoleAddress = z
  .string()
  .trim()
  .refine((value) => {
    const parts = value.split(".");
    return (
      parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
    );
  });

export const starterPackSchema = z.object({
  id: z.literal("gaming-starter-v1"),
  name: z.string(),
  entries: z.array(z.object({ en: z.string().min(1), ar: z.string().min(1) })).min(4),
});
export type StarterPack = z.infer<typeof starterPackSchema>;
export type LastSession = { endedAt: number; lines: number; lastArabic: string };

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("mzgta-phone", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("local", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocal(id: string, value: unknown): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("local", "readwrite");
      tx.objectStore("local").put({ id, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function readLocal(id: string): Promise<unknown> {
  const db = await database();
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction("local").objectStore("local").get(id);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function loadStarterPack(): Promise<StarterPack | null> {
  const result = starterPackSchema.safeParse(await readLocal("starter-pack"));
  return result.success ? result.data : null;
}

/** Progress measures received bytes; 100 is reported only after the IndexedDB commit. */
export async function downloadStarterPack(
  onProgress: (value: number) => void,
  signal?: AbortSignal,
) {
  onProgress(0);
  const response = await fetch("/packs/gaming-starter-v1.json", signal ? { signal } : {});
  if (!response.ok) throw new Error("download");
  const total = Number(response.headers.get("content-length"));
  const reader = response.body?.getReader();
  let text = "";
  if (reader) {
    const decoder = new TextDecoder();
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      text += decoder.decode(chunk.value, { stream: true });
      onProgress(total > 0 ? Math.min(95, Math.round((bytes / total) * 95)) : 50);
    }
    text += decoder.decode();
  } else {
    text = await response.text();
    onProgress(95);
  }
  const pack = starterPackSchema.parse(JSON.parse(text));
  await saveLocal("starter-pack", pack);
  onProgress(100);
  return pack;
}

export function lookupPack(pack: StarterPack | null, text: string): string | undefined {
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[.!?]+$/, "");
  return pack?.entries.find((entry) => normalize(entry.en) === normalize(text))?.ar;
}

export const lastSessionSchema = z.object({
  endedAt: z.number(),
  lines: z.number(),
  lastArabic: z.string(),
});
