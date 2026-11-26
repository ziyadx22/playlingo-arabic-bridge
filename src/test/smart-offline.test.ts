import { describe, expect, it, vi } from "vitest";
import { gamingDictionary } from "@/data/gamingDictionary";
import { translateHybrid, translateSmartOffline } from "@/lib/smart-offline";
const dictionary = new Map(Object.entries(gamingDictionary));
describe("Gaming phrase and morphology translation", () => {
  it("matches a complete objective before word substitution", () => {
    expect(
      translateSmartOffline("Defeat the Boss to finish this quest.", dictionary),
    ).toMatchObject({ ar: "اهزم الزعيم لإتمام هذه المهمة", exact: true, complete: true });
  });
  it("uses longest phrases for HUD idioms", () => {
    expect(translateSmartOffline("take cover and reload", dictionary)).toMatchObject({
      ar: "احتمِ وأعد التلقيم",
      complete: true,
    });
  });
  it("normalizes a verb inflection and orders a definite adjective after its noun", () => {
    expect(translateSmartOffline("collected the golden sword", dictionary)).toMatchObject({
      ar: "اجمع السيف الذهبي",
      complete: true,
    });
  });
  it("preserves unknown names and reports partial coverage without inventing Arabic", () => {
    expect(translateSmartOffline("find the Xyzzoria", dictionary)).toMatchObject({
      ar: "اعثر على ‹the› ‹xyzzoria›",
      complete: false,
      unknown: ["the", "xyzzoria"],
    });
  });
  it("enriches composed sentences through the cloud when online", async () => {
    const cloud = vi.fn().mockResolvedValue({ ar: "اجمع السيف الذهبي", error: null });
    expect(
      await translateHybrid("collect the golden sword", dictionary, true, cloud),
    ).toMatchObject({ ar: "اجمع السيف الذهبي", source: "online" });
    expect(cloud).toHaveBeenCalledWith("collect the golden sword");
  });
  it("never requests the cloud for an exact offline phrase", async () => {
    const cloud = vi.fn();
    expect(await translateHybrid("Game over", dictionary, true, cloud)).toMatchObject({
      ar: "انتهت اللعبة",
      source: "offline",
    });
    expect(cloud).not.toHaveBeenCalled();
  });
  it("returns the offline fallback on quota failure and network loss", async () => {
    const cloud = vi.fn().mockResolvedValue({ ar: "", error: "quota" });
    expect(
      await translateHybrid("collect the golden sword", dictionary, true, cloud),
    ).toMatchObject({ ar: "اجمع السيف الذهبي", source: "offline", warning: "quota" });
    cloud.mockClear();
    expect(await translateHybrid("find xyzzoria", dictionary, false, cloud)).toMatchObject({
      complete: false,
      unknown: ["xyzzoria"],
    });
    expect(cloud).not.toHaveBeenCalled();
  });
});
