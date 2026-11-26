import { createFileRoute } from '@tanstack/react-router'
import { fetchFreeTranslation, translationInput } from "@/lib/free-translation";

// Used by the iOS ReplayKit extension, which cannot call app server functions.
// Public by design: translates bounded English text only, returns no stored data.
export const Route = createFileRoute("/api/public/translate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = translationInput.safeParse(await request.json().catch(() => null));
        if (!body.success) return Response.json({ ar: "", error: "invalid" }, { status: 400 });
        try {
          return Response.json({ ar: await fetchFreeTranslation(body.data.text), error: null });
        } catch (e) {
          const quota = e instanceof Error && e.message === "quota";
          return Response.json({ ar: "", error: quota ? "quota" : "failed" }, { status: 502 });
        }
      },
    },
  },
});
