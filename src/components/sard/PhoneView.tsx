import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Camera,
  CameraOff,
  Languages,
  Loader2,
  Mic,
  MicOff,
  QrCode,
  ScanText,
  Send,
  Sparkles,
  SlidersHorizontal,
  MonitorUp,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrScanner } from "./QrScanner";
import { useSpeech } from "./useSpeech";
import { useOcr } from "./useOcr";
import { COLORS, GLOSSARY, type Settings } from "./data";
import { translateLine } from "@/lib/translate.functions";
import type { SubMsg } from "@/lib/sync";

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  unit = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-display text-neon" dir="ltr">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-[var(--neon)]"
      />
    </label>
  );
}

function highlight(en: string) {
  const re = new RegExp(`\\b(${GLOSSARY.map((g) => g.en).join("|")})\\b`, "gi");
  return en.split(re).map((p, i) =>
    GLOSSARY.some((g) => g.en.toLowerCase() === p.toLowerCase()) ? (
      <mark key={i} className="rounded bg-accent/30 px-1 text-foreground">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

const similar = (a: string, b: string) => {
  const n = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const A = n(a),
    B = n(b);
  if (!A || !B) return false;
  if (A === B || A.includes(B) || B.includes(A)) return true;
  let same = 0;
  for (let i = 0; i < Math.min(A.length, B.length); i++) if (A[i] === B[i]) same++;
  return same / Math.max(A.length, B.length) > 0.8;
};

export function PhoneView({
  sub,
  history,
  onSub,
  s,
  setS,
  room,
  onJoin,
  paired,
  linked,
  connection,
}: {
  sub: SubMsg;
  history: SubMsg[];
  onSub: (m: SubMsg) => void;
  s: Settings;
  setS: (p: Partial<Settings>) => void;
  room: string | null;
  onJoin: (pin: string) => void;
  paired: boolean;
  linked: boolean;
  connection: string;
}) {
  const translate = useServerFn(translateLine);
  const [tab, setTab] = useState<"ctrl" | "style" | "recap">("ctrl");
  const [roi, setRoi] = useState({ x: 8, y: 66, w: 84, h: 24 });
  const [scanQr, setScanQr] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [cam, setCam] = useState(false);
  const [capture, setCapture] = useState<"camera" | "screen">("camera");
  const [busyT, setBusyT] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [conf, setConf] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const lastEn = useRef("");
  const ocr = useOcr();
  const cache = useRef(new Map<string, string>());
  const translating = useRef(false);
  const queued = useRef<{ en: string; speaker: string } | null>(null);

  const handleText = useCallback(
    async (input: string, speaker: string) => {
      const en = input.replace(/\s+/g, " ").trim().slice(0, 600);
      if (en.length < 2 || similar(en, lastEn.current)) return;
      if (translating.current) {
        queued.current = { en, speaker };
        return;
      }
      translating.current = true;
      setBusyT(true);
      setErr(null);
      let next: { en: string; speaker: string } | null = { en, speaker };
      try {
        while (next) {
          const line = next;
          queued.current = null;
          const key = line.en.toLowerCase();
          const saved = cache.current.get(key);
          const r = saved
            ? { ar: saved, error: null }
            : await translate({ data: { text: line.en } });
          if (r.error) {
            setErr(r.error);
            break;
          }
          if (r.ar) {
            if (cache.current.size >= 100) cache.current.clear();
            cache.current.set(key, r.ar);
            lastEn.current = line.en;
            onSub({ en: line.en, ar: r.ar, speaker: line.speaker, id: Date.now() });
          }
          next = queued.current;
        }
      } catch {
        setErr("تعذّرت الترجمة، تحقق من الاتصال");
      } finally {
        queued.current = null;
        translating.current = false;
        setBusyT(false);
      }
    },
    [translate, onSub],
  );

  const speech = useSpeech((t) => void handleText(t, "صوت"));
  const stopCam = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCam(false);
  }, []);
  const startCam = async (mode: "camera" | "screen" = "camera") => {
    stopCam();
    setErr(null);
    try {
      if (mode === "screen" && !navigator.mediaDevices?.getDisplayMedia) {
        setErr(
          "مشاركة الشاشة غير متاحة على هذا الآيفون. استخدم الكاميرا لتصوير التلفاز أو الصق النص.",
        );
        return;
      }
      const st =
        mode === "screen"
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
          : await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: "environment",
                width: { ideal: 1280 },
                frameRate: { ideal: 15, max: 24 },
              },
              audio: false,
            });
      stream.current = st;
      setCapture(mode);
      setCam(true);
      st.getVideoTracks().forEach((track) => {
        track.onended = stopCam;
      });
    } catch {
      setErr(
        mode === "screen"
          ? "تعذّرت مشاركة الشاشة. استخدم الكاميرا أو الصق النص."
          : "تعذّر فتح الكاميرا — اسمح بالوصول من إعدادات المتصفح",
      );
    }
  };
  useEffect(() => {
    if (!cam || !video.current || !stream.current) return;
    video.current.srcObject = stream.current;
    void video.current.play().catch(() => setErr("اضغط تشغيل للسماح بعرض الكاميرا"));
  }, [cam, capture]);
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const readOcr = ocr.read;
  const readNow = useCallback(async () => {
    if (!video.current || translating.current) return;
    try {
      const r = await readOcr(video.current, roi);
      if (r) {
        setConf(r.confidence);
        if (r.confidence > 55) await handleText(r.text, "النص");
      }
    } catch {
      setErr("تعذّر تحميل أو قراءة OCR، حاول مجدداً أو الصق النص");
    }
  }, [readOcr, roi, handleText]);
  const readRef = useRef(readNow);
  readRef.current = readNow;

  // One scan at a time; sleep only after OCR/translation finishes.
  useEffect(() => {
    if (!cam || !s.live || scanQr) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const scan = async () => {
      if (!document.hidden) await readRef.current();
      if (!cancelled) timer = setTimeout(() => void scan(), 750);
    };
    timer = setTimeout(() => void scan(), 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cam, s.live, scanQr]);

  const drag = (mode: "move" | "resize") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!box.current) return;
    const r = box.current.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const start = { ...roi };
    const mv = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / r.width) * 100,
        dy = ((ev.clientY - sy) / r.height) * 100;
      setRoi(
        mode === "move"
          ? {
              ...start,
              x: Math.min(100 - start.w, Math.max(0, start.x + dx)),
              y: Math.min(100 - start.h, Math.max(0, start.y + dy)),
            }
          : {
              ...start,
              w: Math.min(100 - start.x, Math.max(15, start.w + dx)),
              h: Math.min(100 - start.y, Math.max(8, start.h + dy)),
            },
      );
    };
    const up = () => {
      removeEventListener("pointermove", mv);
      removeEventListener("pointerup", up);
    };
    addEventListener("pointermove", mv);
    addEventListener("pointerup", up);
  };

  const onQr = useCallback(
    (text: string) => {
      setScanQr(false);
      const m = text.match(/room=(\d{6})/) ?? text.match(/^(\d{6})$/);
      if (m?.[1]) onJoin(m[1]);
      else setErr("هذا الرمز ليس رمز MZGTA");
    },
    [onJoin],
  );

  const roiBox = (
    <div
      onPointerDown={drag("move")}
      className="absolute cursor-move rounded-md border-2 border-neon bg-neon/10"
      style={{ left: `${roi.x}%`, top: `${roi.y}%`, width: `${roi.w}%`, height: `${roi.h}%` }}
    >
      <span
        className="absolute -top-5 right-0 rounded bg-neon px-1.5 text-[9px] font-bold text-primary-foreground"
        dir="ltr"
      >
        ROI • OCR{conf !== null ? ` ${conf}%` : ""}
      </span>

      <div
        onPointerDown={drag("resize")}
        className="absolute -bottom-2 -left-2 h-4 w-4 cursor-nesw-resize rounded-full bg-neon"
      />
    </div>
  );

  return (
    <div className="relative mx-auto w-full max-w-[400px] rounded-[3rem] border-[10px] border-secondary bg-obsidian p-3">
      {scanQr && <QrScanner onResult={onQr} onClose={() => setScanQr(false)} />}
      <div className="mx-auto mb-3 h-6 w-28 rounded-full bg-secondary" />
      <div className="space-y-3 px-1 pb-4">
        <div className="flex items-center justify-between">
          <span
            className="font-display text-sm font-semibold tracking-wider text-gradient"
            dir="ltr"
          >
            MZGTA
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              stopCam();
              setScanQr(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-neon px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <QrCode className="h-3.5 w-3.5" /> {paired ? `متصل ✓ ${room ?? ""}` : "امسح QR"}
          </Button>
        </div>

        {room && !paired && (
          <p role="status" className="text-xs text-muted-foreground">
            {connection === "disconnected"
              ? "انقطع الاتصال — جارٍ إعادة المحاولة…"
              : "بانتظار التلفاز — افتح شاشة الرمز على التلفاز"}
          </p>
        )}

        {!linked && !paired && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (/^\d{6}$/.test(pinInput)) onJoin(pinInput);
            }}
            className="flex gap-2"
          >
            <input
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="رمز التلفاز (6 أرقام)"
              className="min-w-0 flex-1 rounded-xl border border-input bg-secondary/60 px-3 py-2 text-center font-display tracking-[0.3em] outline-none focus:border-neon"
              dir="ltr"
            />
            <Button variant="ghost" className="rounded-xl glass px-4 text-sm">
              اتصال
            </Button>
          </form>
        )}

        <div ref={box} className="relative select-none touch-none">
          {cam ? (
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-obsidian">
              <video ref={video} playsInline muted className="h-full w-full object-cover" />
              {roiBox}
            </div>
          ) : (
            <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-secondary/40">
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                <Camera className="ml-2 h-5 w-5" />
                الكاميرا / مشاركة الشاشة
              </div>
              {roiBox}
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              onClick={() => (cam && capture === "screen" ? stopCam() : void startCam("screen"))}
              className="glass text-xs"
            >
              <MonitorUp className="h-3.5 w-3.5" />
              {cam && capture === "screen" ? "إيقاف المشاركة" : "مشاركة الشاشة"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => (cam && capture === "camera" ? stopCam() : void startCam("camera"))}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs ${cam ? "bg-gradient-neon text-primary-foreground" : "glass"}`}
            >
              {cam ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}{" "}
              {cam && capture === "camera" ? "إيقاف" : "الكاميرا"}
            </Button>
            <Button
              variant="ghost"
              onClick={speech.toggle}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs ${speech.on ? "bg-gradient-neon text-primary-foreground" : "glass"}`}
            >
              {speech.on ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}{" "}
              {speech.on ? "إيقاف الميكروفون" : "الميكروفون"}
            </Button>
            {cam && (
              <Button
                variant="ghost"
                onClick={() => void readNow()}
                disabled={ocr.busy}
                className="rounded-xl glass px-3 text-xs"
              >
                {ocr.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "اقرأ"}
              </Button>
            )}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {cam
              ? ocr.loading
                ? "جارٍ تحميل محرك OCR لأول مرة…"
                : "وجّه الكاميرا نحو التلفاز واسحب المربع فوق الترجمة الإنجليزية"
              : "شغّل الكاميرا لقراءة النص، أو الميكروفون لترجمة الكلام"}
          </p>
          {speech.on && (
            <p className="mt-1 rounded-lg bg-secondary/60 px-2 py-1 text-[11px]" dir="ltr">
              🎙 {speech.interim || "listening…"}
            </p>
          )}
          {(err || speech.err) && (
            <p className="mt-1 text-[11px] text-destructive">{err ?? speech.err}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl glass p-1 text-xs">
          {(
            [
              ["ctrl", "التحكم", ScanText],
              ["style", "المظهر", SlidersHorizontal],
              ["recap", "ملخص القصة", BookOpen],
            ] as const
          ).map(([k, l, I]) => (
            <Button
              variant="ghost"
              key={k}
              onClick={() => setTab(k)}
              className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] transition ${tab === k ? "bg-gradient-neon text-primary-foreground" : "text-muted-foreground"}`}
            >
              <I className="h-3.5 w-3.5" />
              {l}
            </Button>
          ))}
        </div>

        {tab === "ctrl" && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              onClick={() => setS({ live: !s.live })}
              className="flex w-full items-center justify-between gap-2 whitespace-normal rounded-2xl glass p-3"
            >
              <span className="flex items-center gap-2 text-sm">
                <Languages className="h-4 w-4 text-neon" /> OCR والترجمة المباشرة
              </span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${s.live ? "bg-gradient-neon" : "bg-muted"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-all ${s.live ? "left-0.5" : "left-[1.375rem]"}`}
                />
              </span>
            </Button>
            <div key={sub.id} className="animate-subin rounded-2xl glass p-3">
              <p className="text-[11px] text-muted-foreground" dir="ltr">
                {sub.en ? highlight(sub.en) : "Waiting for English game text…"}
              </p>
              <p className="mt-2 text-base font-semibold" style={{ color: s.color }}>
                {s.live ? sub.ar || "بانتظار أول ترجمة" : "— العرض على التلفاز متوقف —"}
              </p>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>{sub.speaker}</span>
                {busyT && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> يترجم…
                  </span>
                )}
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const t = typed.trim();
                if (t) {
                  lastEn.current = "";
                  void handleText(t, "");
                  setTyped("");
                }
              }}
              className="flex gap-2"
            >
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-label="English game text"
                maxLength={600}
                placeholder="Paste English game text…"
                dir="ltr"
                className="min-w-0 flex-1 rounded-xl border border-input bg-secondary/60 px-3 py-2 text-sm outline-none focus:border-neon"
              />
              <Button
                variant="ghost"
                aria-label="ترجم وأرسل"
                className="rounded-xl bg-gradient-neon px-3 text-primary-foreground"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-[10px] leading-5 text-muted-foreground">
              ترجمة مجانية عبر MyMemory بحد يومي؛ يُرسل النص الإنجليزي فقط للخدمة، وليس الفيديو. قد
              تختلف جودة ترجمة مصطلحات الألعاب.
            </p>
            <section className="space-y-2 border-y border-border py-3">
              <h3 className="text-sm font-semibold" dir="ltr">
                PS5 Remote Play • الإعداد والتشغيل
              </h3>
              <ol className="list-inside list-decimal space-y-1 text-xs leading-6 text-muted-foreground">
                <li>على PS5: الإعدادات ← النظام ← اللعب عن بُعد ← تمكين اللعب عن بُعد.</li>
                <li>افتح PS Remote Play وسجّل الدخول بحساب PlayStation نفسه، ثم اختر PS5.</li>
                <li>
                  فعّل الترجمة الإنجليزية في اللعبة، ووجّه كاميرا MZGTA نحو شريط الحوار على التلفاز
                  أو جهاز آخر.
                </li>
              </ol>
              <p className="text-[11px] leading-5 text-muted-foreground">
                الآيفون لا يتيح Split View أو التقاط شاشة تطبيق آخر من المتصفح؛ لا تعتمد على
                Picture-in-Picture في PS Remote Play. على iPad، استخدم تعدد المهام فقط إذا دعمه
                التطبيق. مشاركة الشاشة هنا تعمل في المتصفحات الداعمة على الكمبيوتر.
              </p>
              <p className="text-[11px] leading-5 text-muted-foreground">
                MZGTA يعرض الترجمة في متصفح التلفاز؛ لا يستطيع وضعها فوق مدخل HDMI الخاص بـ PS5.
              </p>
              <Button asChild variant="outline" className="w-full text-xs">
                <a
                  href="https://apps.apple.com/app/ps-remote-play/id1436192460"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  فتح PS Remote Play في App Store
                </a>
              </Button>
            </section>
            <div className="rounded-2xl glass p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> قاموس الألعاب
              </p>
              <div className="grid grid-cols-2 gap-2">
                {GLOSSARY.map((g) => (
                  <div
                    key={g.en}
                    className="flex justify-between rounded-lg bg-secondary/60 px-2 py-1.5 text-xs"
                  >
                    <span>{g.ar}</span>
                    <span className="font-display text-neon" dir="ltr">
                      {g.en}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "style" && (
          <div className="space-y-4 rounded-2xl glass p-4">
            <Slider
              label="حجم الخط على التلفاز"
              value={s.font}
              min={14}
              max={40}
              unit="px"
              onChange={(v) => setS({ font: v })}
            />
            <Slider
              label="الموضع العمودي"
              value={s.pos}
              min={2}
              max={60}
              unit="%"
              onChange={(v) => setS({ pos: v })}
            />
            <Slider
              label="شفافية الزجاج"
              value={s.opacity}
              min={0}
              max={95}
              unit="%"
              onChange={(v) => setS({ opacity: v })}
            />
            <div>
              <p className="mb-2 text-xs">لون النص النيون</p>
              <div className="flex gap-3">
                {COLORS.map((c) => (
                  <Button
                    variant="ghost"
                    key={c.name}
                    title={c.name}
                    onClick={() => setS({ color: c.v })}
                    className={`h-8 w-8 rounded-full transition ${s.color === c.v ? "ring-2 ring-foreground ring-offset-2 ring-offset-obsidian scale-110" : ""}`}
                    style={{ background: c.v }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "recap" && (
          <div className="space-y-2 rounded-2xl glass p-4 text-sm leading-7">
            <p className="flex items-center gap-1.5 font-display text-neon">
              <Sparkles className="h-4 w-4" /> سجل الجلسة
            </p>
            {history.length === 0 ? (
              <p className="text-muted-foreground">لا توجد حوارات مترجمة بعد.</p>
            ) : (
              history.slice(-12).map((h) => (
                <p key={h.id}>
                  {h.speaker && <b className="text-muted-foreground">{h.speaker}: </b>}
                  {h.ar}
                </p>
              ))
            )}
            <div className="text-[11px] text-muted-foreground">{history.length} سطر مترجم</div>
          </div>
        )}
      </div>
    </div>
  );
}
