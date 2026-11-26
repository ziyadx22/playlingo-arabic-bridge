import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Smartphone, Tv } from "lucide-react";
import { Logo } from "@/components/sard/Logo";
import { TvView } from "@/components/sard/TvView";
import { PhoneView } from "@/components/sard/PhoneView";
import { LINES, type Settings } from "@/components/sard/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سرد برو | ترجمة عربية فورية لألعاب PS5" },
      { name: "description", content: "SARD Pro: ترجمة عربية حية لألعاب بلايستيشن 5 على التلفاز الذكي عبر الآيفون." },
      { property: "og:title", content: "سرد برو — SARD Pro" },
      { property: "og:description", content: "ترجمة حوارات الألعاب إلى العربية لحظياً فوق شاشة التلفاز." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [view, setView] = useState<"both" | "tv" | "phone">("both");
  const [paired, setPaired] = useState(false);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [s, set] = useState<Settings>({ font: 26, pos: 8, opacity: 45, color: "var(--neon)", autoHide: true, live: true });
  const setS = (p: Partial<Settings>) => set((o) => ({ ...o, ...p }));

  useEffect(() => {
    if (!s.live) return;
    const t = setInterval(() => { setIdx((i) => (i + 1) % LINES.length); setVisible(true); }, 4500);
    return () => clearInterval(t);
  }, [s.live]);
  useEffect(() => {
    if (!s.autoHide) { setVisible(true); return; }
    const t = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, [idx, s.autoHide]);

  const line = LINES[idx]!;
  return (
    <div className="min-h-screen mesh-bg">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <Logo />
          <div><h1 className="font-display text-2xl font-bold text-gradient">سرد برو</h1><p className="text-xs text-muted-foreground">ترجمة عربية حية لألعاب PS5</p></div>
        </div>
        <nav className="flex gap-1 rounded-2xl glass p-1 text-sm">
          {([["both", "العرض الكامل", null], ["tv", "التلفاز", Tv], ["phone", "الآيفون", Smartphone]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => setView(k)} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${view === k ? "bg-gradient-neon text-primary-foreground glow-neon" : "text-muted-foreground hover:text-foreground"}`}>{I && <I className="h-4 w-4" />}{l}</button>
          ))}
        </nav>
      </header>
      <main className={`mx-auto grid max-w-7xl gap-8 px-6 pb-12 ${view === "both" ? "lg:grid-cols-[1fr_400px]" : ""}`}>
        {view !== "phone" && <section><TvView paired={paired} onPair={() => setPaired(true)} line={line} idx={idx} visible={visible} s={s} setS={setS} /></section>}
        {view !== "tv" && <section><PhoneView line={line} idx={idx} s={s} setS={setS} paired={paired} onPair={() => setPaired(true)} /></section>}
      </main>
    </div>
  );
}
