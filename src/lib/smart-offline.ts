import { gamingDictionary, normalizeEnglish } from "@/data/gamingDictionary";
export type OfflineTranslation = {
  ar: string;
  exact: boolean;
  complete: boolean;
  unknown: string[];
  coverage: number;
};
const irregular: Record<string, string> = {
  found: "find",
  fought: "fight",
  ran: "run",
  took: "take",
  gone: "go",
  went: "go",
  bought: "buy",
  brought: "bring",
  caught: "catch",
  killed: "kill",
  defeated: "defeat",
  collected: "collect",
  opened: "open",
  closed: "close",
  lost: "lose",
  was: "be",
  were: "be",
  has: "have",
  had: "have",
};
const adjectives = new Set([
  "red",
  "blue",
  "green",
  "black",
  "white",
  "golden",
  "ancient",
  "hidden",
  "locked",
  "broken",
  "rare",
  "legendary",
  "magic",
  "cursed",
  "dangerous",
]);
function stems(word: string): string[] {
  const values = [word];
  const root = irregular[word];
  if (root) values.push(root);
  if (word.endsWith("ies")) values.push(word.slice(0, -3) + "y");
  if (word.endsWith("ing")) {
    const base = word.slice(0, -3);
    values.push(base, base + "e");
    if (base.at(-1) === base.at(-2)) values.push(base.slice(0, -1));
  }
  if (word.endsWith("ed")) values.push(word.slice(0, -2), word.slice(0, -1));
  if (word.endsWith("es")) values.push(word.slice(0, -2));
  if (word.endsWith("s")) values.push(word.slice(0, -1));
  if (word.endsWith("'s")) values.push(word.slice(0, -2));
  return values;
}
/** Conservative phrase-first fallback. Unknown text stays visible; no invented translation. */
export function translateSmartOffline(
  text: string,
  dictionary: ReadonlyMap<string, string> = new Map(Object.entries(gamingDictionary)),
): OfflineTranslation {
  const normalized = normalizeEnglish(text);
  const direct = dictionary.get(normalized);
  if (direct) return { ar: direct, exact: true, complete: true, unknown: [], coverage: 1 };
  const words = normalized.split(" ").filter(Boolean);
  const output: string[] = [];
  const unknown: string[] = [];
  let covered = 0;
  const lookup = (word: string) =>
    stems(word)
      .map((x) => dictionary.get(x))
      .find(Boolean);
  for (let i = 0; i < words.length;) {
    let matched = false;
    for (let length = Math.min(10, words.length - i); length > 1; length--) {
      const phrase = words.slice(i, i + length).join(" ");
      const ar = dictionary.get(phrase);
      if (ar) {
        output.push(ar);
        covered += length;
        i += length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const word = words[i];
    if (!word) break;
    // Determiner + known adjective/noun -> Arabic noun then adjective; not a general grammar claim.
    const definite = word === "the";
    const start = definite || word === "a" || word === "an" ? i + 1 : i;
    const adjective = words[start];
    const noun = words[start + 1];
    if (adjective && noun && adjectives.has(adjective)) {
      const a = lookup(adjective);
      const n = lookup(noun);
      if (a && n && !n.includes(" ") && !a.includes(" ")) {
        output.push(`${definite ? "ال" : ""}${n} ${definite ? "ال" : ""}${a}`);
        covered += start - i + 2;
        i = start + 2;
        continue;
      }
    }
    if ((word === "the" || word === "a" || word === "an") && words[i + 1]) {
      const next = words[i + 1];
      const ar = next ? lookup(next) : undefined;
      if (ar && !ar.includes(" ")) {
        output.push(`${definite ? "ال" : ""}${ar}`);
        covered += 2;
        i += 2;
        continue;
      }
    }
    const ar = lookup(word);
    if (ar) {
      output.push(ar);
      covered++;
    } else if (/^\d+$/.test(word)) {
      output.push(word);
      covered++;
    } else {
      unknown.push(word);
      output.push(`‹${word}›`);
    }
    i++;
  }
  return {
    ar: output.join(" ").replace(/(^|\s)و /g, "$1و"),
    exact: false,
    complete: words.length > 0 && unknown.length === 0,
    unknown: [...new Set(unknown)],
    coverage: words.length ? covered / words.length : 0,
  };
}
export async function translateHybrid(
  text: string,
  dictionary: ReadonlyMap<string, string>,
  online: boolean,
  cloud: (text: string) => Promise<{ ar: string; error: string | null }>,
) {
  const local = translateSmartOffline(text, dictionary);
  if (local.exact) return { ...local, source: "offline" as const, warning: null };
  let warning: string | null = null;
  if (online) {
    try {
      const r = await cloud(text);
      if (!r.error && r.ar)
        return {
          ...local,
          ar: r.ar,
          complete: true,
          unknown: [],
          source: "online" as const,
          warning: null,
        };
      warning = r.error;
    } catch {
      warning = "تعذّرت الترجمة عبر الإنترنت.";
    }
  }
  return {
    ...local,
    source: "offline" as const,
    warning: local.complete
      ? warning
      : "ترجمة محلية جزئية؛ الكلمات بين ‹ › غير موجودة في القاموس. أعد المحاولة عند الاتصال بالإنترنت.",
  };
}
