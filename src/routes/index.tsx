import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Smartphone, Tv } from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/sard/Logo";
import { TvView } from "@/components/sard/TvView";
import { PhoneView } from "@/components/sard/PhoneView";
import { type Settings } from "@/components/sard/data";
import { Button } from "@/components/ui/button";
import { useRoom, type Msg, type SubMsg } from "@/lib/sync";

const search = z.object({
  view: z.enum(["both", "tv", "phone"]).optional(),
  room: z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(z.string().regex(/^\d{6}$/))
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "MZGTA | ترجمة عربية فورية لألعاب PS5" },
      {
        name: "description",
        content: "MZGTA: ترجمة عربية حية لألعاب بلايستيشن 5 على التلفاز الذكي عبر الآيفون.",
      },
      { property: "og:title", content: "MZGTA — ترجمة الألعاب الحية" },
      {
        property: "og:description",
        content: "ترجمة حوارات الألعاب إلى العربية لحظياً فوق شاشة التلفاز.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULTS: Settings = {
  font: 26,
  pos: 8,
  opacity: 45,
  color: "var(--neon)",
  autoHide: true,
  live: true,
};
const EMPTY_SUB: SubMsg = { en: "", ar: "", speaker: "", id: 0 };

function Index() {
  const { view = "both", room: urlRoom } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const isPhone = view === "phone";

  const [pin, setPin] = useState("");
  const [url, setUrl] = useState("");
  const [paired, setPaired] = useState(false);
  const [sub, setSub] = useState<SubMsg>(EMPTY_SUB);
  const [history, setHistory] = useState<SubMsg[]>([]);
  const [visible, setVisible] = useState(true);
  const [s, set] = useState<Settings>(DEFAULTS);

  // TV (and combined view) owns a random 6-digit room; the phone joins via URL / QR / typed PIN.
  useEffect(() => {
    if (isPhone) return;
    const p = String(Math.floor(100000 + Math.random() * 900000));
    setPin(p);
    setUrl(`${window.location.origin}/?view=phone&room=${p}`);
  }, [isPhone]);

  const room = isPhone ? (urlRoom ?? null) : pin || null;

  const pushSub = useCallback((m: SubMsg) => {
    setSub(m);
    setVisible(true);
    setHistory((h) => [...h.slice(-49), m]);
  }, []);

  const latest = useRef({ sub, s });
  latest.current = { sub, s };
  const onMsg = useCallback(
    (m: Msg) => {
      if (m.t === "hello") {
        setPaired(true);
        sendRef.current({ t: "ack" });
        if (!isPhone) {
          sendRef.current({ t: "settings", s: latest.current.s });
          if (latest.current.sub.ar) sendRef.current({ t: "sub", sub: latest.current.sub });
        }
      } else if (m.t === "ack") setPaired(true);
      else if (m.t === "sub") pushSub(m.sub);
      else if (m.t === "settings") set(m.s);
    },
    [pushSub, isPhone],
  );
  const { status, send, peers } = useRoom(room, onMsg);
  const sendRef = useRef(send);
  sendRef.current = send;

  // phone announces itself once connected
  useEffect(() => {
    if (!isPhone || status !== "live") return;
    send({ t: "hello" });
    const retry = setInterval(() => {
      if (!paired) send({ t: "hello" });
    }, 2000);
    return () => clearInterval(retry);
  }, [isPhone, status, send, paired]);
  useEffect(() => {
    setPaired(false);
  }, [room]);
  useEffect(() => {
    if (status !== "live" || peers === 0) setPaired(false);
  }, [status, peers]);

  const setS = (p: Partial<Settings>) => {
    const n = { ...latest.current.s, ...p };
    set(n);
    sendRef.current({ t: "settings", s: n });
  };
  const emitSub = useCallback(
    (m: SubMsg) => {
      pushSub(m);
      sendRef.current({ t: "sub", sub: m });
    },
    [pushSub],
  );

  useEffect(() => {
    setVisible(true);
    if (!s.autoHide) return;
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [sub.id, s.autoHide]);

  const tabs = [
    ["both", "العرض الكامل", null],
    ["tv", "التلفاز", Tv],
    ["phone", "الآيفون", Smartphone],
  ] as const;
  return (
    <div className="min-h-screen mesh-bg">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wider text-gradient" dir="ltr">
              MZGTA
            </h1>
            <p className="text-xs text-muted-foreground">ترجمة عربية حية لألعاب PS5</p>
          </div>
        </div>
        <nav className="flex gap-1 rounded-2xl glass p-1 text-sm">
          {tabs.map(([k, l, I]) => (
            <Button
              variant="ghost"
              key={k}
              onClick={() => navigate({ search: { view: k, ...(room ? { room } : {}) } })}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs sm:text-sm transition ${view === k ? "bg-gradient-neon text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {I && <I className="h-4 w-4" />}
              {l}
            </Button>
          ))}
        </nav>
      </header>
      <main
        className={`mx-auto grid grid-cols-[minmax(0,1fr)] max-w-7xl gap-8 px-3 sm:px-6 pb-12 ${view === "both" ? "lg:grid-cols-[minmax(0,1fr)_400px]" : ""}`}
      >
        {view !== "phone" && (
          <section className="min-w-0">
            <TvView
              pin={pin}
              url={url}
              paired={paired || (view === "both" && !!sub.ar)}
              live={status === "live" && peers > 0}
              sub={sub}
              visible={visible}
              s={s}
              setS={setS}
              ready={status === "live"}
            />
          </section>
        )}
        {view !== "tv" && (
          <section className="min-w-0">
            <PhoneView
              sub={sub}
              history={history}
              onSub={emitSub}
              s={s}
              setS={setS}
              room={room}
              paired={paired}
              linked={view === "both"}
              connection={status}
              onJoin={(p) => navigate({ search: { view: "phone", room: p } })}
            />
          </section>
        )}
      </main>
    </div>
  );
}
