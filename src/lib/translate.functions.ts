import { createServerFn } from "@tanstack/react-start";
import { fetchFreeTranslation, translationInput } from "./free-translation";

export const translateLine = createServerFn({ method: "POST" })
  .inputValidator((i) => translationInput.parse(i))
  .handler(async ({ data }) => {
    try {
      return { ar: await fetchFreeTranslation(data.text), error: null as string | null };
    } catch (e) {
      return {
        ar: "",
        error:
          e instanceof Error && e.message === "quota"
            ? "وصلت خدمة MyMemory إلى حدها المجاني اليومي. حاول لاحقاً."
            : "تعذّرت الترجمة المجانية، تحقق من الاتصال وحاول مجدداً",
      };
    }
  });
