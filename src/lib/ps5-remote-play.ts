import { Capacitor, registerPlugin } from "@capacitor/core";
import { z } from "zod";
import { consoleAddress, pairingPin } from "./phone-storage";
export type DiscoveredConsole = {
  ip: string;
  hostId: string;
  hostName: string;
  type: "PS5" | "PS4";
  status: string;
};
export type ConsoleRegistration = { registered: boolean; ip: string; nickname?: string };
interface PS5RemotePlay {
  discoverConsoles(): Promise<{ consoles: DiscoveredConsole[] }>;
  registerConsole(input: {
    ip: string;
    pin: string;
    accountId: string;
  }): Promise<ConsoleRegistration>;
  getRegistration(input: { ip: string }): Promise<ConsoleRegistration>;
  removeRegistration(input: { ip: string }): Promise<{ removed: boolean }>;
}
const plugin = registerPlugin<PS5RemotePlay>("PS5RemotePlay");
export function nativePS5Available() {
  return Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("PS5RemotePlay");
}
/** Installed iPhone app built with PS5 pairing switched off (no multicast entitlement). */
export function ps5PairingDisabledInBuild() {
  return (
    Capacitor.getPlatform() === "ios" &&
    !Capacitor.isPluginAvailable("PS5RemotePlay") &&
    Capacitor.isPluginAvailable("MZGTACapture")
  );
}
export const accountIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9+/]{11}=$/, "Use the base64-encoded eight-byte PSN account ID");
export const registrationInput = z.object({
  ip: consoleAddress.refine((ip) => {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168)
    );
  }),
  pin: pairingPin,
  accountId: accountIdSchema,
});
function requireNative() {
  if (!nativePS5Available()) throw new Error("NATIVE_IOS_REQUIRED");
}
export async function discoverConsoles() {
  requireNative();
  return plugin.discoverConsoles();
}
export async function registerConsole(input: z.infer<typeof registrationInput>) {
  requireNative();
  return plugin.registerConsole(registrationInput.parse(input));
}
export async function getConsoleRegistration(ip: string) {
  requireNative();
  return plugin.getRegistration({ ip });
}
export async function removeConsoleRegistration(ip: string) {
  requireNative();
  return plugin.removeRegistration({ ip });
}
