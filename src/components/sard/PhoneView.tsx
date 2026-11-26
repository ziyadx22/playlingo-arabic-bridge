import { useCallback, useEffect, useRef, useState } from "react";
import { CAPTURE_LABEL, useCaptureStatus } from "@/lib/use-capture-status";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  RefreshCw,
  Send,
  SlidersHorizontal,
  ScanText,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrScanner } from "./QrScanner";
import { useSpeech } from "./useSpeech";
import { useOcr } from "./useOcr";
import { COLORS, GLOSSARY, type Settings } from "./data";
import { translateLine } from "@/lib/translate.functions";
import type { SubMsg } from "@/lib/sync";
import { PhoneFlow } from "./PhoneFlow";
import { Switch } from "@/components/ui/switch";
import { loadGamingDictionary } from "@/lib/gaming-dictionary-storage";
import { translateHybrid } from "@/lib/smart-offline";
import { gamingDictionary } from "@/data/gamingDictionary";
import { changeRoi, type Roi } from "./roi";

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
        className="w-full accent-phone-primary"
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
  onLeave,
  onRefresh,
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
  onLeave: () => void;
  onRefresh: () => void;
}) {
  const translate = useServerFn(translateLine);
  const [active, setActive] = useState(false);
  const [running, setRunning] = useState(false);
  const [consoleRegistered, setConsoleRegistered] = useState(false);
  const psCapture = useCaptureStatus();
  const retryOffline = useRef<{ en: string; speaker: string } | null>(null);
  const [second, setSecond] = useState(false);
  const [editing, setEditing] = useState(true);
  const [roi2, setRoi2] = useState<Roi>({ x: 8, y: 12, w: 84, h: 20 });
  const captured = useRef(["", ""]);
  const [roi, setRoi] = useState({ x: 8, y: 66, w: 84, h: 24 });
  const [scanQr, setScanQr] = useState(false);
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
            ? { ar: saved, exact: true, source: "offline" as const, warning: null }
            : await translateHybrid(
                line.en,
                await loadGamingDictionary().catch(() => new Map(Object.entries(gamingDictionary))),
                navigator.onLine,
                (text) => translate({ data: { text } }),
              );
          if (r.warning) setErr(r.warning);
          if (r.ar) {
            if (r.exact || r.source === "online") {
              if (cache.current.size >= 100) cache.current.clear();
              cache.current.set(key, r.ar);
              retryOffline.current = null;
            } else retryOffline.current = line;
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
  useEffect(() => {
    const retry = () => {
      const pending = retryOffline.current;
      if (pending) {
        lastEn.current = "";
        void handleText(pending.en, pending.speaker);
      }
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [handleText]);

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

  const stopSpeech = speech.stop;
  useEffect(() => {
    if (!active) {
      stopCam();
      stopSpeech();
      setRunning(false);
    }
  }, [active, stopCam, stopSpeech]);

  const readOcr = ocr.read;
  const readNow = useCallback(async () => {
    if (!video.current || translating.current) return;
    try {
      const regions = second ? [roi, roi2] : [roi];
      for (const [index, region] of regions.entries()) {
        const r = await readOcr(video.current, region);
        if (r) {
          setConf(r.confidence);
          if (
            r.confidence > 55 &&
            r.text.length > 1 &&
            !similar(r.text, captured.current[index] ?? "")
          ) {
            await handleText(r.text, "النص");
            if (similar(r.text, lastEn.current)) captured.current[index] = r.text;
          }
        }
      }
    } catch {
      setErr("تعذّر تحميل أو قراءة OCR، حاول مجدداً أو الصق النص");
    }
  }, [readOcr, roi, roi2, second, handleText]);
  const readRef = useRef(readNow);
  readRef.current = readNow;

  // One scan at a time; sleep only after OCR/translation finishes.
  useEffect(() => {
    if (!active || !running || !cam || !s.live || scanQr) return;
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
  }, [active, running, cam, s.live, scanQr]);

  const drag = (mode: "move" | "resize", target: 0 | 1) => (e: React.PointerEvent) => {
    if (!editing || !box.current) return;
    e.preventDefault();
    e.stopPropagation();
    const bounds = box.current.getBoundingClientRect();
    const startX = e.clientX,
      startY = e.clientY;
    const start = target === 0 ? roi : roi2;
    const move = (event: PointerEvent) => {
      const next = changeRoi(
        start,
        mode,
        ((event.clientX - startX) / bounds.width) * 100,
        ((event.clientY - startY) / bounds.height) * 100,
      );
      if (target === 0) setRoi(next);
      else setRoi2(next);
    };
    const up = () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", up);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
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

  const roiBox = (region: Roi, index: 0 | 1) => (
    <div
      onPointerDown={drag("move", index)}
      aria-label={index === 0 ? "مربع قراءة الترجمة" : "مربع القراءة الثاني"}
      className={`absolute rounded border-2 ${index === 0 ? "border-phone-primary bg-phone-primary/5" : "border-violet bg-violet/5"} ${editing ? "cursor-move" : "pointer-events-none"}`}
      style={{
        left: `${region.x}%`,
        top: `${region.y}%`,
        width: `${region.w}%`,
        height: `${region.h}%`,
      }}
    >
      <span
        className={`absolute -top-6 right-0 rounded px-1.5 py-0.5 text-[9px] ${index === 0 ? "bg-phone-primary text-phone-primary-foreground" : "bg-violet text-accent-foreground"}`}
      >
        {index === 0 ? "مربع قراءة الترجمة" : "مربع ثانٍ"}
        {conf !== null ? ` · ${conf}%` : ""}
      </span>
      {editing && (
        <div
          aria-label="تغيير حجم مربع القراءة"
          onPointerDown={drag("resize", index)}
          className={`absolute -bottom-2 -right-2 size-5 cursor-nwse-resize rounded-sm border-2 border-phone-background ${index === 0 ? "bg-phone-primary" : "bg-violet"}`}
        />
      )}
    </div>
  );

  const styles = (
    <div className="space-y-6">
      <div className="phone-card p-5 text-center">
        <p className="font-semibold" style={{ color: s.color, fontSize: `${s.font}px` }}>
          جاهز تلعب بالعربي؟
        </p>
        <p className="mt-2 text-[10px] text-phone-muted">معاينة الترجمة</p>
      </div>
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
      <fieldset>
        <legend className="mb-3 text-xs">لون الترجمة</legend>
        <div className="flex gap-4">
          {COLORS.map((c) => (
            <Button
              variant="ghost"
              key={c.name}
              title={c.name}
              aria-label={c.name}
              aria-pressed={s.color === c.v}
              onClick={() => setS({ color: c.v })}
              className={`size-9 rounded-full p-0 ${s.color === c.v ? "ring-2 ring-phone-foreground ring-offset-2 ring-offset-phone-background" : ""}`}
              style={{ background: c.v }}
            >
              {s.color === c.v && <Check className="text-phone-background" />}
            </Button>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center justify-between border-t border-phone-border pt-5">
        <label htmlFor="auto-hide" className="text-sm">
          إخفاء الترجمة تلقائياً
        </label>
        <Switch
          id="auto-hide"
          dir="ltr"
          checked={s.autoHide}
          onCheckedChange={(v) => setS({ autoHide: v })}
        />
      </div>
    </div>
  );

  return (
    <>
      {scanQr && <QrScanner onResult={onQr} onClose={() => setScanQr(false)} />}
      <PhoneFlow
        paired={paired}
        room={room}
        connection={connection}
        history={history}
        onJoin={onJoin}
        onLeave={onLeave}
        onRefresh={onRefresh}
        onScan={() => {
          stopCam();
          setScanQr(true);
        }}
        onTest={() =>
          onSub({
            en: "MZGTA TV connection test",
            ar: "التلفزيون جاهز — استمتع باللعب بالعربي!",
            speaker: "MZGTA",
            id: Date.now(),
          })
        }
        onPack={() => {
          void loadGamingDictionary().catch(() => {});
        }}
        onConsoleRegistration={setConsoleRegistered}
        onLiveChange={setActive}
        styleView={styles}
        liveView={(onStyle) => (
          <div className="space-y-5">
            <div>
              <div
                ref={box}
                className="relative aspect-video touch-none select-none overflow-hidden rounded-lg border border-phone-border bg-phone-surface"
              >
                {cam ? (
                  <video
                    ref={video}
                    playsInline
                    muted
                    aria-label="معاينة الكاميرا"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pb-5 text-phone-muted">
                    <Camera className="size-8" strokeWidth={1} />
                    <span className="text-xs">معاينة الكاميرا</span>
                  </div>
                )}
                {roiBox(roi, 0)}
                {second && roiBox(roi2, 1)}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-phone-muted">
                  {cam
                    ? capture === "camera"
                      ? "الكاميرا المباشرة"
                      : "مشاركة الشاشة"
                    : "لا يوجد بث PS5 مباشر في المتصفح"}
                </span>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs text-phone-primary"
                  aria-pressed={editing}
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? "تم" : "تعديل"}
                  <ArrowLeft />
                </Button>
              </div>
            </div>
            <div className="flex items-start justify-between gap-2 border-y border-phone-border py-4">
              <div className="space-y-2 text-[11px]">
                <p className="flex items-center gap-2 text-phone-muted">
                  <span
                    className={`size-1.5 rounded-full ${psCapture.state === "live" ? "bg-phone-primary" : "bg-phone-muted"}`}
                  />{" "}
                  {psCapture.state === "live"
                    ? CAPTURE_LABEL.live
                    : consoleRegistered
                      ? "البلايستيشن مقترن · التقاط الشاشة غير مفعّل"
                      : "لا يوجد اتصال بالبلايستيشن"}
                </p>
                <p
                  className={`flex items-center gap-2 ${paired ? "text-phone-primary" : "text-phone-muted"}`}
                >
                  <Wifi className="size-3" />
                  {paired ? "التلفزيون متصل" : room ? "نتصل بالتلفزيون..." : "التلفزيون غير مربوط"}
                </p>
              </div>
              <Button
                variant="ghost"
                className="h-8 px-2 text-xs text-phone-primary"
                onClick={onRefresh}
              >
                <RefreshCw /> تحديث
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-10 border-phone-border bg-phone-surface text-xs"
                onClick={() => (cam && capture === "camera" ? stopCam() : void startCam("camera"))}
              >
                {cam && capture === "camera" ? <CameraOff /> : <Camera />}
                {cam && capture === "camera" ? "إيقاف الكاميرا" : "الكاميرا"}
              </Button>
              <Button
                variant="outline"
                className="h-10 border-phone-border bg-phone-surface text-xs"
                onClick={() => (cam && capture === "screen" ? stopCam() : void startCam("screen"))}
              >
                <MonitorUp /> مشاركة الشاشة
              </Button>
              <Button
                variant="outline"
                className={`h-10 border-phone-border bg-phone-surface text-xs ${speech.on ? "text-phone-primary" : ""}`}
                onClick={speech.toggle}
              >
                {speech.on ? <MicOff /> : <Mic />}
                {speech.on ? "إيقاف الميكروفون" : "الميكروفون"}
              </Button>
              <Button
                variant="outline"
                className="h-10 border-phone-border bg-phone-surface text-xs"
                disabled={!cam || ocr.busy || busyT}
                onClick={() => {
                  setS({ live: true });
                  void readNow();
                }}
              >
                {ocr.busy ? <Loader2 className="animate-spin" /> : <ScanText />} اقرأ الآن
              </Button>
            </div>
            {ocr.loading && (
              <p role="status" className="text-xs text-phone-primary">
                جارٍ تحميل محرك القراءة لأول مرة…
              </p>
            )}
            {speech.on && (
              <p className="text-xs text-phone-muted" dir="ltr">
                {speech.interim || "Listening…"}
              </p>
            )}
            {(err || speech.err) && (
              <p role="alert" className="text-xs leading-6 text-destructive">
                {err ?? speech.err}
              </p>
            )}
            <div className="flex items-center justify-between">
              <label htmlFor="second-roi" className="text-sm">
                مربع ترجمة ثانٍ
              </label>
              <Switch
                id="second-roi"
                dir="ltr"
                checked={second}
                onCheckedChange={(value) => {
                  setSecond(value);
                  captured.current[1] = "";
                }}
              />
            </div>
            <Button
              variant="ghost"
              className="h-11 w-full justify-between border-y border-phone-border px-0 text-sm"
              onClick={onStyle}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="text-phone-primary" /> تخصيص شكل الترجمة
              </span>
              <ArrowLeft />
            </Button>
            <Button
              variant="phone"
              className="h-12 w-full"
              disabled={ocr.loading}
              onClick={() => {
                const next = !running;
                setRunning(next);
                setS({ live: next });
                if (next && !cam) void startCam("camera");
              }}
            >
              {running ? "أوقف الترجمة" : "ابدأ الترجمة"}
              <ArrowLeft />
            </Button>
            <div className="phone-card p-4">
              <p className="text-[11px] leading-6 text-phone-muted" dir="ltr">
                {sub.en ? highlight(sub.en) : "Waiting for English game text…"}
              </p>
              <p className="mt-2 text-base font-semibold leading-7" style={{ color: s.color }}>
                {sub.ar || "بانتظار أول ترجمة"}
              </p>
              {busyT && (
                <p
                  role="status"
                  className="mt-2 flex items-center gap-2 text-xs text-phone-primary"
                >
                  <Loader2 className="size-3 animate-spin" /> يترجم…
                </p>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.trim()) {
                  lastEn.current = "";
                  setS({ live: true });
                  void handleText(typed, "");
                  setTyped("");
                }
              }}
              className="flex gap-2"
            >
              <input
                aria-label="English game text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                maxLength={600}
                placeholder="Paste English game text…"
                dir="ltr"
                className="phone-input text-xs"
              />
              <Button
                variant="phone"
                aria-label="ترجم وأرسل"
                className="h-11 px-3"
                disabled={busyT || !typed.trim()}
              >
                <Send />
              </Button>
            </form>
            <details className="border-t border-phone-border pt-4 text-xs leading-7 text-phone-muted">
              <summary className="cursor-pointer text-phone-foreground">
                PS Remote Play · ملاحظات الاتصال
              </summary>
              <p className="mt-3">
                شغّل الترجمة الإنجليزية في اللعبة ووجّه الكاميرا نحو التلفزيون. الآيفون لا يتيح
                التقاط شاشة تطبيق آخر من المتصفح، ولا يتيح Split View. مشاركة الشاشة تتطلب متصفحاً
                داعماً على الكمبيوتر.
              </p>
              <p className="mt-2">
                MZGTA يعرض الترجمة في متصفح التلفزيون، وليس فوق مدخل HDMI. ترجمة MyMemory مجانية بحد
                يومي؛ يُرسل النص فقط.
              </p>
            </details>
          </div>
        )}
      />
    </>
  );
}
