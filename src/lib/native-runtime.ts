import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { z } from "zod";
import { translationInput } from "./free-translation";

export const HOSTED_APP_ORIGIN = "https://playlingo-arabic-bridge.lovable.app";

export function isLocalIosApp() {
  return (
    typeof window !== "undefined" &&
    Capacitor.getPlatform() === "ios" &&
    Capacitor.isNativePlatform() &&
    window.location.protocol === "capacitor:"
  );
}

export function captureApiBase() {
  return isLocalIosApp() ? HOSTED_APP_ORIGIN : window.location.origin;
}

const reply = z.object({ ar: z.string(), error: z.string().nullable() });
type TranslationReply = z.infer<typeof reply>;

/** Local iOS has no Worker. Use the existing public translation endpoint via native HTTP. */
export async function translateForApp(
  text: string,
  browserTranslate: (text: string) => Promise<TranslationReply>,
): Promise<TranslationReply> {
  if (!isLocalIosApp()) return browserTranslate(text);
  const response = await CapacitorHttp.post({
    url: `${HOSTED_APP_ORIGIN}/api/public/translate`,
    headers: { "Content-Type": "application/json" },
    data: translationInput.parse({ text }),
    connectTimeout: 10000,
    readTimeout: 20000,
    responseType: "json",
  });
  const parsed = reply.safeParse(response.data);
  if (!parsed.success) throw new Error("translation-unavailable");
  if (response.status !== 200 || parsed.data.error) {
    return {
      ar: "",
      error:
        parsed.data.error === "quota"
          ? "وصلت خدمة MyMemory إلى حدها المجاني اليومي. حاول لاحقاً."
          : "تعذّرت الترجمة المجانية، تحقق من الاتصال وحاول مجدداً",
    };
  }
  return parsed.data;
}
