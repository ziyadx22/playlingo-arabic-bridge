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
export type PS5Capabilities = { autoDiscovery: boolean; manualAddress: boolean };
interface PS5RemotePlay {
  getCapabilities(): Promise<PS5Capabilities>;
  discoverConsoles(): Promise<{ consoles: DiscoveredConsole[] }>;
  /** Unicast discovery to one typed address; resolves only if a PlayStation answers. */
  probeConsole(input: { ip: string }): Promise<{ consoles: DiscoveredConsole[] }>;
  registerConsole(input: {
    ip: string;
    pin: string;
    /** Optional; the native plugin uses eight zero bytes when omitted. */
    accountId?: string;
  }): Promise<ConsoleRegistration>;
  getRegistration(input: { ip: string }): Promise<ConsoleRegistration>;
  removeRegistration(input: { ip: string }): Promise<{ removed: boolean }>;
}
const plugin = registerPlugin<PS5RemotePlay>("PS5RemotePlay");
export function nativePS5Available() {
  return Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("PS5RemotePlay");
}
/** Installed iPhone app (Capacitor native shell), regardless of plugin state. */
export function runningInIOSApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}
export const accountIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9+/]{11}=$/, "Use the base64-encoded eight-byte PSN account ID");
/**
 * PS5 needs the numeric PSN account ID (not the online ID/username). Accept it
 * as base64 (8 bytes) or as the decimal user ID, converted little-endian like Chiaki.
 */
export function normalizeAccountId(raw: string): string | null {
  const value = raw.trim();
  if (accountIdSchema.safeParse(value).success) return value;
  if (!/^\d{1,20}$/.test(value)) return null;
  const id = BigInt(value);
  if (id === 0n || id > 0xffffffffffffffffn) return null;
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) bytes[i] = Number((id >> BigInt(8 * i)) & 0xffn);
  return btoa(String.fromCharCode(...bytes));
}
/** Looks like a PSN online ID (username), which PS5 pairing cannot use. */
export function looksLikeOnlineId(raw: string) {
  const v = raw.trim();
  return /^[A-Za-z][A-Za-z0-9_-]{2,15}$/.test(v) && normalizeAccountId(v) === null;
}
export const registrationInput = z.object({
  ip: z.lazy(() => privateIPv4),
  pin: pairingPin,
  accountId: accountIdSchema.optional(),
});
function requireNative() {
  if (!nativePS5Available()) throw new Error("NATIVE_IOS_REQUIRED");
}
export const privateIPv4 = consoleAddress.refine((ip) => {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168);
}, "Use the PS5's local Wi-Fi address, e.g. 192.168.1.20");
export async function getCapabilities(): Promise<PS5Capabilities> {
  requireNative();
  return plugin.getCapabilities();
}
/** Error code from the native plugin (e.g. MULTICAST_UNAVAILABLE, CONSOLE_NOT_FOUND). */
export function nativeErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}
export async function probeConsole(ip: string) {
  requireNative();
  return plugin.probeConsole({ ip: privateIPv4.parse(ip.trim()) });
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

export type NativeBridgeStatus = "active" | "native-no-plugin" | "browser";
/** Reads window.Capacitor directly so the badge reflects the real Swift bridge, never a web mock. */
export function nativeBridgeStatus(): NativeBridgeStatus {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return "browser";
  if (nativePS5Available()) return "active";
  return "native-no-plugin";
}
