import { describe, expect, it } from "vitest";
import { appendSubtitle } from "@/lib/subtitle-history";

describe("Session history after reconnect", () => {
  it("counts a replayed subtitle only once", () => {
    const line = { en: "Quest", ar: "مهمة", speaker: "", id: 123 };
    const first = appendSubtitle([], line);
    expect(appendSubtitle(first, line)).toEqual([line]);
    expect(appendSubtitle(first, { ...line, id: 124 })).toHaveLength(2);
  });
});
