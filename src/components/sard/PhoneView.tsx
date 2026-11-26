import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Camera, CameraOff, Languages, Loader2, Mic, MicOff, QrCode, ScanText, Send, Sparkles, SlidersHorizontal } from "lucide-react";
import { GameScene } from "./GameScene";
import { QrScanner } from "./QrScanner";
import { useSpeech } from "./useSpeech";
import { useOcr } from "./useOcr";
import { COLORS, GLOSSARY, type Settings } from "./data";
import { translateLine } from "@/lib/translate.functions";
import type { SubMsg } from "@/lib/sync";

function Slider({ label, value, min, max, onChange, unit = "" }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="font-display text-neon" dir="ltr">{value}{unit}</span></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-[var(--neon)]" />
    </label>
  );
}

function highlight(en: string) {
  const re = new RegExp(`\\b(${GLOSSARY.map((g) => g.en).join("|")})\\b`, "gi");
  return en.split(re).map((p, i) => GLOSSARY.some((g) => g.en.toLowerCase() === p.toLowerCase())
    ? <mark key={i} className="rounded bg-accent/30 px-1 text-foreground">{p}</mark> : <span key={i}>{p}</span>);
}

const similar = (a: string, b: string) => {
  const n = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const A = n(a), B = n(b); if (!A || !B) return false;
  if (A === B || A.includes(B) || B.includes(A)) return true;
  let same = 0; for (let i = 0; i < Math.min(A.length, B.length); i++) if (A[i] === B[i]) same++;
  return same / Math.max(A.length, B.length) > 0.8;
};

export function PhoneView({ sub, history, onSub, s, setS, room, onJoin, paired, linked }: {
  sub: SubMsg; history: SubMsg[]; onSub: (m: SubMsg) => void; s: Settings; setS: (p: Partial<Settings>) => void;
  room: string | null; onJoin: (pin: string) => void; paired: boolean; linked: boolean;
}) {
  const translate = useServerFn(translateLine);
  const [tab, setTab] = useState<"ctrl" | "style" | "recap">("ctrl");
  const [roi, setRoi] = useState({ x: 8, y: 66, w: 84, h: 24 });
  const [scanQr, setScanQr] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [cam, setCam] = useState(false);
  const [busyT, setBusyT] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [conf, setConf] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const lastEn = useRef("");
  const ocr = useOcr();

  const handleText = useCallback(async (en: string, speaker: string) => {
    if (en.length < 3 || similar(en, lastEn.current)) return;
    lastEn.current = en; setBusyT(true); setErr(null);
    try {
      const r = await translate({ data: { text: en.slice(0, 600) } });
      if (r.error) setErr(r.error);
      else if (r.ar) onSub({ en, ar: r.ar, speaker, id: Date.now() });
    } catch { setErr("تعذّرت الترجمة، تحقق من الاتصال"); }
    finally { setBusyT(false); }
  }, [translate, onSub]);

  const speech = useSpeech((t) => void handleText(t, "صوت"));

  const startCam = async () => {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } } });
      stream.current = st; setCam(true);
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = st; void video.current.play(); } });
    } catch { setErr("تعذّر فتح الكاميرا — اسمح بالوصول من إعدادات المتصفح"); }
  };
  const stopCam = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCam(false); };
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const readNow = useCallback(async () => {
    if (!video.current) return;
    const r = await ocr.read(video.current, roi);
    if (r) { setConf(r.confidence); if (r.confidence > 55) void handleText(r.text, "النص"); }
  }, [ocr, roi, handleText]);

  // Live OCR loop while camera + live translation are on
  useEffect(() => {
    if (!cam || !s.live) return;
    const t = setInterval(() => { void readNow(); }, 2500);
    return () => clearInterval(t);
  }, [cam, s.live, readNow]);

  const drag = (mode: "move" | "resize") => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const r = box.current!.getBoundingClientRect(); const sx = e.clientX, sy = e.clientY; const start = { ...roi };
    const mv = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / r.width) * 100, dy = ((ev.clientY - sy) / r.height) * 100;
      setRoi(mode === "move"
        ? { ...start, x: Math.min(100 - start.w, Math.max(0, start.x + dx)), y: Math.min(100 - start.h, Math.max(0, start.y + dy)) }
        : { ...start, w: Math.min(100 - start.x, Math.max(15, start.w + dx)), h: Math.min(100 - start.y, Math.max(8, start.h + dy)) });
    };
    const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); };
    addEventListener("pointermove", mv); addEventListener("pointerup", up);
  };

  const onQr = useCallback((text: string) => {
    setScanQr(false);
    const m = text.match(/room=(\d{6})/) ?? text.match(/^(\d{6})$/);
    if (m?.[1]) onJoin(m[1]); else setErr("هذا الرمز ليس رمز MZGTA");
  }, [onJoin]);

  const roiBox = (
    <div onPointerDown={drag("move")} className="absolute cursor-move rounded-md border-2 border-neon bg-neon/10 glow-neon"
      style={{ left: `${roi.x}%`, top: `${roi.y}%`, width: `${roi.w}%`, height: `${roi.h}%` }}>
      <span className="absolute -top-5 right-0 rounded bg-neon px-1.5 text-[9px] font-bold text-primary-foreground" dir="ltr">ROI • OCR{conf !== null ? ` ${conf}%` : ""}</span>
      {(ocr.busy || (s.live && cam)) && <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-transparent via-neon/40 to-transparent animate-scan" />}
      <div onPointerDown={drag("resize")} className="absolute -bottom-2 -left-2 h-4 w-4 cursor-nesw-resize rounded-full bg-neon" />
    </div>
  );

  return (
    <div className="relative mx-auto w-full max-w-[400px] rounded-[3rem] border-[10px] border-secondary bg-obsidian p-3 shadow-2xl glow-violet">
      {scanQr && <QrScanner onResult={onQr} onClose={() => setScanQr(false)} />}
      <div className="mx-auto mb-3 h-6 w-28 rounded-full bg-secondary" />
      <div className="space-y-3 px-1 pb-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold tracking-wider text-gradient" dir="ltr">MZGTA</span>
          <button onClick={() => setScanQr(true)} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-neon px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <QrCode className="h-3.5 w-3.5" /> {paired ? `متصل ✓ ${room ?? ""}` : "امسح QR"}
          </button>
        </div>

        {!linked && !paired && (
          <form onSubmit={(e) => { e.preventDefault(); if (/^\d{6}$/.test(pinInput)) onJoin(pinInput); }} className="flex gap-2">
            <input value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="رمز التلفاز (6 أرقام)"
              className="min-w-0 flex-1 rounded-xl border border-input bg-secondary/60 px-3 py-2 text-center font-display tracking-[0.3em] outline-none focus:border-neon" dir="ltr" />
            <button className="rounded-xl glass px-4 text-sm">اتصال</button>
          </form>
        )}

        <div ref={box} className="relative select-none touch-none">
          {cam ? (
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-obsidian">
              <video ref={video} playsInline muted className="h-full w-full object-cover" />
              {roiBox}
            </div>
          ) : (
            <GameScene showEnglish line={sub.en}>{roiBox}</GameScene>
          )}
          <div className="mt-2 flex gap-2">
            <button onClick={cam ? stopCam : startCam} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs ${cam ? "bg-gradient-neon text-primary-foreground" : "glass"}`}>
              {cam ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />} {cam ? "إيقاف الكاميرا" : "كاميرا OCR"}
            </button>
            <button onClick={speech.toggle} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs ${speech.on ? "bg-gradient-neon text-primary-foreground" : "glass"}`}>
              {speech.on ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />} {speech.on ? "إيقاف الميكروفون" : "الميكروفون"}
            </button>
            {cam && <button onClick={() => void readNow()} disabled={ocr.busy} className="rounded-xl glass px-3 text-xs">{ocr.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "اقرأ"}</button>}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {cam ? (ocr.loading ? "جارٍ تحميل محرك OCR لأول مرة…" : "وجّه الكاميرا نحو التلفاز واسحب المربع فوق الترجمة الإنجليزية") : "شغّل الكاميرا لقراءة النص، أو الميكروفون لترجمة الكلام"}
          </p>
          {speech.on && <p className="mt-1 rounded-lg bg-secondary/60 px-2 py-1 text-[11px]" dir="ltr">🎙 {speech.interim || "listening…"}</p>}
          {(err || speech.err) && <p className="mt-1 text-[11px] text-destructive">{err ?? speech.err}</p>}
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl glass p-1 text-xs">
          {([["ctrl", "التحكم", ScanText], ["style", "المظهر", SlidersHorizontal], ["recap", "ملخص القصة", BookOpen]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex items-center justify-center gap-1 rounded-lg py-2 transition ${tab === k ? "bg-gradient-neon text-primary-foreground" : "text-muted-foreground"}`}><I className="h-3.5 w-3.5" />{l}</button>
          ))}
        </div>

        {tab === "ctrl" && (
          <div className="space-y-3">
            <button onClick={() => setS({ live: !s.live })} className="flex w-full items-center justify-between rounded-2xl glass p-3">
              <span className="flex items-center gap-2 text-sm"><Languages className="h-4 w-4 text-neon" /> OCR والترجمة الذكية المباشرة</span>
              <span className={`relative h-6 w-11 rounded-full transition ${s.live ? "bg-gradient-neon" : "bg-muted"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-all ${s.live ? "left-0.5" : "left-[1.375rem]"}`} />
              </span>
            </button>
            <div key={sub.id} className="animate-subin rounded-2xl glass p-3 glow-neon">
              <p className="text-[11px] text-muted-foreground" dir="ltr">{highlight(sub.en)}</p>
              <p className="mt-2 text-base font-semibold" style={{ color: s.color }}>{s.live ? sub.ar : "— العرض على التلفاز متوقف —"}</p>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{sub.speaker}</span>{busyT && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> يترجم…</span>}</div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const t = typed.trim(); if (t) { lastEn.current = ""; void handleText(t, ""); setTyped(""); } }} className="flex gap-2">
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type English line…" dir="ltr" className="min-w-0 flex-1 rounded-xl border border-input bg-secondary/60 px-3 py-2 text-sm outline-none focus:border-neon" />
              <button aria-label="ترجم وأرسل" className="rounded-xl bg-gradient-neon px-3 text-primary-foreground"><Send className="h-4 w-4" /></button>
            </form>
            <div className="rounded-2xl glass p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-accent" /> قاموس الألعاب</p>
              <div className="grid grid-cols-2 gap-2">
                {GLOSSARY.map((g) => <div key={g.en} className="flex justify-between rounded-lg bg-secondary/60 px-2 py-1.5 text-xs"><span>{g.ar}</span><span className="font-display text-neon" dir="ltr">{g.en}</span></div>)}
              </div>
            </div>
          </div>
        )}

        {tab === "style" && (
          <div className="space-y-4 rounded-2xl glass p-4">
            <Slider label="حجم الخط على التلفاز" value={s.font} min={14} max={40} unit="px" onChange={(v) => setS({ font: v })} />
            <Slider label="الموضع العمودي" value={s.pos} min={2} max={60} unit="%" onChange={(v) => setS({ pos: v })} />
            <Slider label="شفافية الزجاج" value={s.opacity} min={0} max={95} unit="%" onChange={(v) => setS({ opacity: v })} />
            <div>
              <p className="mb-2 text-xs">لون النص النيون</p>
              <div className="flex gap-3">
                {COLORS.map((c) => <button key={c.name} title={c.name} onClick={() => setS({ color: c.v })} className={`h-8 w-8 rounded-full transition ${s.color === c.v ? "ring-2 ring-foreground ring-offset-2 ring-offset-obsidian scale-110" : ""}`} style={{ background: c.v, boxShadow: `0 0 14px ${c.v}` }} />)}
              </div>
            </div>
          </div>
        )}

        {tab === "recap" && (
          <div className="space-y-2 rounded-2xl glass p-4 text-sm leading-7">
            <p className="flex items-center gap-1.5 font-display text-neon"><Sparkles className="h-4 w-4" /> سجل الجلسة</p>
            {history.length === 0 ? <p className="text-muted-foreground">لا توجد حوارات مترجمة بعد.</p> :
              history.slice(-12).map((h) => <p key={h.id}>{h.speaker && <b className="text-muted-foreground">{h.speaker}: </b>}{h.ar}</p>)}
            <div className="text-[11px] text-muted-foreground">{history.length} سطر مترجم</div>
          </div>
        )}
      </div>
    </div>
  );
}
