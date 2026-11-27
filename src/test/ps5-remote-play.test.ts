import { describe, expect, it } from "vitest";
import { nativePS5Available, registrationInput, registerConsole } from "@/lib/ps5-remote-play";
describe("Native PS5 registration boundary", () => {
  it("requires eight PIN digits and an eight-byte base64 account ID", () => {
    expect(
      registrationInput.safeParse({
        ip: "192.168.0.192",
        pin: "12345678",
        accountId: "AQIDBAUGBwg=",
      }).success,
    ).toBe(true);
    for (const pin of ["1234567", "123456789", "abcd1234"])
      expect(
        registrationInput.safeParse({ ip: "192.168.0.192", pin, accountId: "AQIDBAUGBwg=" })
          .success,
      ).toBe(false);
    expect(
      registrationInput.safeParse({ ip: "192.168.0.192", pin: "12345678", accountId: "PSN-name" })
        .success,
    ).toBe(false);
  });
  it("allows registration only to private local IPv4 addresses", () => {
    for (const ip of ["10.0.0.2", "172.16.0.2", "172.31.0.2", "192.168.0.192"])
      expect(
        registrationInput.safeParse({ ip, pin: "12345678", accountId: "AQIDBAUGBwg=" }).success,
      ).toBe(true);
    for (const ip of ["8.8.8.8", "127.0.0.1", "172.32.0.2", "192.168.0.999"])
      expect(
        registrationInput.safeParse({ ip, pin: "12345678", accountId: "AQIDBAUGBwg=" }).success,
      ).toBe(false);
  });
  it("does not claim native pairing in the browser", async () => {
    expect(nativePS5Available()).toBe(false);
    await expect(
      registerConsole({ ip: "192.168.0.192", pin: "12345678", accountId: "AQIDBAUGBwg=" }),
    ).rejects.toThrow("NATIVE_IOS_REQUIRED");
  });
});
describe("Manual PS5 address", () => {
  it("accepts only private local IPv4 addresses typed by the user", async () => {
    const { privateIPv4, probeConsole } = await import("@/lib/ps5-remote-play");
    expect(privateIPv4.safeParse("192.168.1.20").success).toBe(true);
    expect(privateIPv4.safeParse("8.8.8.8").success).toBe(false);
    await expect(probeConsole("192.168.1.20")).rejects.toThrow("NATIVE_IOS_REQUIRED");
  });
});
