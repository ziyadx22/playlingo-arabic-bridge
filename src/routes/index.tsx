import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Smartphone, Tv } from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/sard/Logo";
import { TvView } from "@/components/sard/TvView";
import { PhoneView } from "@/components/sard/PhoneView";
import { LINES, type Settings } from "@/components/sard/data";
import { useRoom, type Msg, type SubMsg } from "@/lib/sync";

const search = z.object({ view: z.enum(["both", "tv", "phone"]).optional(), room: z.union([z.string(), z.number()]).transform(String).pipe(z.string().regex(/^\d{6}$/)).optional().catch(undefined) });

export const Route = createFileRoute("/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "MZGTA | ترجمة عربية فورية لألعاب PS5" },
      { name: "description", content: "MZGTA: ترجمة عربية حية لألعاب بلايستيشن 5 على التلفاز الذكي عبر الآيفون." },
      { property: "og:title", content: "MZGTA — ترجمة الألعاب الحية" },
      { property: "og:description", content: "ترجمة حوارات الألعاب إلى العربية لحظياً فوق شاشة التلفاز." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULTS: Settings = { font: 26, pos: 8, opacity: 45, color: "var(--neon)", autoHide: true, live: true };
const demoSub = (i: number): SubMsg => ({ ...LINES[i % LINES.length]!, id: i });

function Index() {
  const { view = "both", room: urlRoom } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const isPhone = view === "phone";

  const [pin, setPin] = useState("");
  const [url, setUrl] = useState("");
  const [paired, setPaired] = useState(false);
  const [sub, setSub] = useState<SubMsg>(() => demoSub(0));
  const [history, setHistory] = useState<SubMsg[]>([]);
  const [demo, setDemo] = useState(true);
  const [visible, setVisible] = useState(true);
  const [s, set] = useState<Settings>(DEFAULTS);

  // TV (and combined view) owns a random 6-digit room; the phone joins via URL / QR / typed PIN.
  useEffect(() => {
    if (isPhone) return;
    const p = String(Math.floor(100000 + Math.random() * 900000));
    setPin(p);
    setUrl(`${window.location.origin}/?view=phone&room=${p}`);
  }, [isPhone]);

  const room = isPhone ? urlRoom ?? null : pin || null;

  const pushSub = useCallback((m: SubMsg) => {
    setDemo(false); setSub(m); setVisible(true);
    setHistory((h) => [...h.slice(-49), m]);
  }, []);

  const onMsg = useCallback((m: Msg) => {
    if (m.t === "hello") { setPaired(true); sendRef.current({ t: "ack" }); }
    else if (m.t === "ack") setPaired(true);
    else if (m.t === "sub") pushSub(m.sub);
    else if (m.t === "settings") set(m.s);
  }, [pushSub]);
  const { status, send } = useRoom(room, onMsg);
  const sendRef = useRef(send); sendRef.current = send;

  // phone announces itself once connected
  useEffect(() => { if (isPhone && status === "live") send({ t: "hello" }); }, [isPhone, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const setS = (p: Partial<Settings>) => set((o) => { const n = { ...o, ...p }; sendRef.current({ t: "settings", s: n }); return n; });
  const emitSub = useCallback((m: SubMsg) => { pushSub(m); sendRef.current({ t: "sub", sub: m }); }, [pushSub]);

  // demo dialogue until real text arrives (combined view only)
  useEffect(() => {
    if (!demo || view !== "both" || !s.live) return;
    const t = setInterval(() => setSub((x) => demoSub(x.id + 1)), 4500);
    return () => clearInterval(t);
  }, [demo, view, s.live]);
  useEffect(() => {
    setVisible(true);
    if (!s.autoHide) return;
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [sub.id, s.autoHide]);

  const tabs = [["both", "العرض الكامل", null], ["tv", "التلفاز", Tv], ["phone", "الآيفون", Smartphone]] as const;
  return (
    <div className="min-h-screen mesh-bg">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <Logo />
          <div><h1 className="font-display text-2xl font-bold tracking-wider text-gradient" dir="ltr">MZGTA</h1><p className="text-xs text-muted-foreground">ترجمة عربية حية لألعاب PS5</p></div>
        </div>
        <nav className="flex gap-1 rounded-2xl glass p-1 text-sm">
          {tabs.map(([k, l, I]) => (
            <button key={k} onClick={() => navigate({ search: { view: k } })} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${view === k ? "bg-gradient-neon text-primary-foreground glow-neon" : "text-muted-foreground hover:text-foreground"}`}>{I && <I className="h-4 w-4" />}{l}</button>
          ))}
        </nav>
      </header>
      <main className={`mx-auto grid max-w-7xl gap-8 px-6 pb-12 ${view === "both" ? "lg:grid-cols-[1fr_400px]" : ""}`}>
        {view !== "phone" && (
          <section>
            <TvView pin={pin} url={url} paired={paired || view === "both" && !demo} live={status === "live"} sub={sub} visible={visible} s={s} setS={setS}
              onDemoPair={() => setPaired(true)} />
          </section>
        )}
        {view !== "tv" && (
          <section>
            <PhoneView sub={sub} history={history} onSub={emitSub} s={s} setS={setS} room={room} paired={paired} linked={view === "both"}
              onJoin={(p) => navigate({ search: { view: "phone", room: p } })} />
          </section>
        )}
      </main>
    </div>
  );
}
