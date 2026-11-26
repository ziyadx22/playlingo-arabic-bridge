import { Capacitor, registerPlugin } from "@capacitor/core";
import { z } from "zod";

export type CaptureStatus = {
  active?: boolean;
  paused?: boolean;
  heartbeat?: number;
  frames?: number;
  lastEnglish?: string;
  lastArabic?: string;
  sentAt?: number;
  error?: string;
};
interface MZGTACapture {
  configure(input: CaptureConfig): Promise<{ configured: boolean }>;
  showPicker(): Promise<{ shown: boolean }>;
  getStatus(): Promise<CaptureStatus>;
}
const plugin = registerPlugin<MZGTACapture>("MZGTACapture");

/** Screen regions as top-left fractions of the iPhone screen. */
export const REGION_PRESETS = {
  bottom: { x: 0.04, y: 0.7, w: 0.92, h: 0.24 },
  lower: { x: 0.04, y: 0.55, w: 0.92, h: 0.4 },
  full: { x: 0, y: 0, w: 1, h: 1 },
} as const;
export type RegionPreset = keyof typeof REGION_PRESETS;

export const captureConfig = z.object({
  room: z.string().regex(/^\d{6}$/),
  apiBase: z.string().url().startsWith("https://"),
  realtimeUrl: z.string().url().startsWith("https://"),
  anonKey: z.string().min(1),
  regions: z
    .array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().gt(0).max(1), h: z.number().gt(0).max(1) }))
    .min(1)
    .max(2),
});
export type CaptureConfig = z.infer<typeof captureConfig>;

export function nativeCaptureAvailable() {
  return Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("MZGTACapture");
}

export async function startScreenCapture(room: string, preset: RegionPreset) {
  if (!nativeCaptureAvailable()) throw new Error("NATIVE_IOS_REQUIRED");
  await plugin.configure(
    captureConfig.parse({
      room,
      apiBase: window.location.origin,
      realtimeUrl: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      regions: [REGION_PRESETS[preset]],
    }),
  );
  return plugin.showPicker();
}

export function getCaptureStatus() {
  return plugin.getStatus();
}

/** The extension is "live" only while it is broadcasting and has reported a frame recently. */
export function captureState(s: CaptureStatus, now = Date.now() / 1000) {
  if (!s.active) return s.paused ? "paused" : "stopped";
  return s.heartbeat && now - s.heartbeat < 6 ? "live" : "waiting";
}
