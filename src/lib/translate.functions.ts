import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PROMPT = `You translate English video-game subtitles into natural, cinematic Modern Standard Arabic for an on-screen subtitle overlay.
Gaming glossary (always use): Quest=مهمة, Boss=زعيم, Checkpoint=نقطة حفظ, Lore=أساطير العالم, Side quest=مهمة جانبية, Save=حفظ, Level up=ارتقاء مستوى, Skill tree=شجرة المهارات.
OCR text may contain noise or line breaks: fix obvious OCR errors silently. Reply with ONLY the Arabic translation, no quotes or notes. If the input has no meaningful text, reply with an empty string.`;

export const translateLine = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ text: z.string().min(1).max(600) }).parse(i))
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: PROMPT,
        input: data.text,
      });
      let out = "";
      for (const item of (res as { output?: unknown[] }).output ?? []) {
        const content = (item as { content?: { type?: string; text?: string }[] }).content ?? [];
        for (const c of content) if (c.type === "output_text" && c.text) out += c.text;
      }
      return { ar: out.trim(), error: null as string | null };
    } catch (e) {
      if (e instanceof GatewayError) {
        console.error("translate failed", e.code, e.httpStatus);
        return { ar: "", error: e.code === "payment_required" ? "نفد رصيد الذكاء الاصطناعي" : "تعذّرت الترجمة، حاول مجدداً" };
      }
      throw e;
    }
  });
