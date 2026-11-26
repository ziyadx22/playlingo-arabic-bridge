import { z } from "zod";
import {
  DICTIONARY_MIN_ENTRIES,
  DICTIONARY_VERSION,
  gamingDictionary,
  normalizeEnglish,
} from "@/data/gamingDictionary";

const entrySchema = z.object({
  en: z.string().min(1).max(120),
  ar: z
    .string()
    .min(1)
    .max(1000)
    .regex(/[\u0600-\u06ff]/),
});
const packSchema = z.object({
  id: z.literal(DICTIONARY_VERSION),
  name: z.string(),
  entryCount: z.number().int().min(DICTIONARY_MIN_ENTRIES),
  entries: z.array(entrySchema).min(DICTIONARY_MIN_ENTRIES),
});
export type DictionarySummary = { id: string; count: number; installedAt: number };
export type DictionaryProgress = {
  percent: number;
  indexed: number;
  total: number;
  phase: "download" | "index" | "ready";
};
let cached: Promise<Map<string, string>> | null = null;
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("mzgta-dictionary", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("entries", { keyPath: ["version", "en"] });
      request.result.createObjectStore("meta");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("storage-blocked"));
  });
}
function complete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("aborted"));
  });
}
function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const summarySchema = z.object({
  id: z.string(),
  count: z.number().int().min(DICTIONARY_MIN_ENTRIES),
  installedAt: z.number(),
});
export async function loadDictionarySummary(): Promise<DictionarySummary | null> {
  const db = await database();
  try {
    const parsed = summarySchema.safeParse(
      await result(db.transaction("meta").objectStore("meta").get("active")),
    );
    return parsed.success ? parsed.data : null;
  } finally {
    db.close();
  }
}
export async function downloadGamingDictionary(
  onProgress: (p: DictionaryProgress) => void,
  signal?: AbortSignal,
): Promise<DictionarySummary> {
  onProgress({ percent: 0, indexed: 0, total: 0, phase: "download" });
  const response = await fetch("/packs/gaming-dictionary-v2.json", signal ? { signal } : {});
  if (!response.ok) throw new Error("download");
  const reader = response.body?.getReader();
  const size = Number(response.headers.get("content-length"));
  let text = "";
  if (reader) {
    const decoder = new TextDecoder();
    let bytes = 0;
    while (true) {
      signal?.throwIfAborted();
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      text += decoder.decode(chunk.value, { stream: true });
      onProgress({
        percent: size > 0 ? Math.min(45, Math.round((bytes / size) * 45)) : 20,
        indexed: 0,
        total: 0,
        phase: "download",
      });
    }
    text += decoder.decode();
  } else {
    text = await response.text();
  }
  signal?.throwIfAborted();
  const pack = packSchema.parse(JSON.parse(text));
  const unique = new Map(pack.entries.map((e) => [normalizeEnglish(e.en), e.ar]));
  if (unique.size !== pack.entryCount || unique.has("") || unique.size < DICTIONARY_MIN_ENTRIES)
    throw new Error("entry-count");
  const rows = [...unique].map(([en, ar]) => ({ version: pack.id, en, ar }));
  const db = await database();
  try {
    // Ready metadata is committed only after ALL batches. Interrupted installs are not readable.
    for (let offset = 0; offset < rows.length; offset += 1000) {
      signal?.throwIfAborted();
      const tx = db.transaction("entries", "readwrite");
      const done = complete(tx);
      for (const row of rows.slice(offset, offset + 1000)) tx.objectStore("entries").put(row);
      await done;
      const indexed = Math.min(offset + 1000, rows.length);
      onProgress({
        percent: 45 + Math.round((indexed / rows.length) * 54),
        indexed,
        total: rows.length,
        phase: "index",
      });
    }
    signal?.throwIfAborted();
    const summary = { id: pack.id, count: unique.size, installedAt: Date.now() };
    const tx = db.transaction("meta", "readwrite");
    const done = complete(tx);
    tx.objectStore("meta").put(summary, "active");
    await done;
    cached = null;
    onProgress({ percent: 100, indexed: summary.count, total: summary.count, phase: "ready" });
    return summary;
  } finally {
    db.close();
  }
}
export async function loadGamingDictionary(): Promise<Map<string, string>> {
  if (!cached)
    cached = (async () => {
      const terms = new Map<string, string>();
      const summary = await loadDictionarySummary();
      if (summary) {
        const db = await database();
        try {
          const rows: { en: string; ar: string }[] = await result(
            db
              .transaction("entries")
              .objectStore("entries")
              .getAll(IDBKeyRange.bound([summary.id, ""], [summary.id, "\uffff"])),
          );
          if (rows.length !== summary.count) throw new Error("incomplete-dictionary");
          for (const row of rows) terms.set(row.en, row.ar);
        } finally {
          db.close();
        }
      }
      for (const [en, ar] of Object.entries(gamingDictionary)) terms.set(en, ar);
      return terms;
    })().catch((e) => {
      cached = null;
      throw e;
    });
  return cached;
}
