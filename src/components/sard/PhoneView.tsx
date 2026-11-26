import { useRef, useState } from "react";
import { BookOpen, Languages, QrCode, ScanText, Sparkles, SlidersHorizontal } from "lucide-react";
import { GameScene } from "./GameScene";
import { COLORS, GLOSSARY, LINES, type Line, type Settings } from "./data";

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

export function PhoneView({ line, idx, s, setS, paired, onPair }: { line: Line; idx: number; s: Settings; setS: (p: Partial<Settings>) => void; paired: boolean; onPair: () => void }) {
  const [tab, setTab] = useState<"ctrl" | "style" | "recap">("ctrl");
  const [roi, setRoi] = useState({ x: 10, y: 72, w: 80, h: 18 });
  const [scanning, setScanning] = useState(false);
  const box = useRef<HTMLDivElement>(null);

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

  const scan = () => { setScanning(true); setTimeout(() => { setScanning(false); onPair(); }, 1600); };

  return (
    <div className="mx-auto w-full max-w-[400px] rounded-[3rem] border-[10px] border-secondary bg-obsidian p-3 shadow-2xl glow-violet">
      <div className="mx-auto mb-3 h-6 w-28 rounded-full bg-secondary" />
      <div className="space-y-3 px-1 pb-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold text-gradient">سرد برو</span>
          <button onClick={scan} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-neon px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <QrCode className="h-3.5 w-3.5" /> {scanning ? "جارٍ المسح…" : paired ? "متصل ✓" : "امسح QR"}
          </button>
        </div>

        <div ref={box} className="relative select-none touch-none">
          <GameScene showEnglish line={line.en}>
            <div onPointerDown={drag("move")} className="absolute cursor-move rounded-md border-2 border-neon bg-neon/10 glow-neon"
              style={{ left: `${roi.x}%`, top: `${roi.y}%`, width: `${roi.w}%`, height: `${roi.h}%` }}>
              <span className="absolute -top-5 right-0 rounded bg-neon px-1.5 text-[9px] font-bold text-primary-foreground" dir="ltr">ROI • OCR</span>
              {s.live && <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-transparent via-neon/40 to-transparent animate-scan" />}
              <div onPointerDown={drag("resize")} className="absolute -bottom-1.5 -left-1.5 h-3 w-3 cursor-nesw-resize rounded-full bg-neon" />
            </div>
          </GameScene>
          <p className="mt-1 text-[10px] text-muted-foreground">بث Remote Play — اسحب المربع فوق منطقة الترجمة الإنجليزية</p>
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
            <div key={idx} className="animate-subin rounded-2xl glass p-3 glow-neon">
              <p className="text-[11px] text-muted-foreground" dir="ltr">{highlight(line.en)}</p>
              <p className="mt-2 text-base font-semibold" style={{ color: s.color }}>{s.live ? line.ar : "— الترجمة متوقفة —"}</p>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{line.speaker}</span><span dir="ltr">OCR 98% • 120ms</span></div>
            </div>
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
          <div className="space-y-3 rounded-2xl glass p-4 text-sm leading-7">
            <p className="flex items-center gap-1.5 font-display text-neon"><Sparkles className="h-4 w-4" /> ملخص الجلسة بالذكاء الاصطناعي</p>
            <p>بدأت الجلسة عند <b>نقطة الحفظ</b> قرب البوابة الشمالية. حذّر كراتوس ابنه من <b>الزعيم</b> القابع خلفها، بينما كشف أتريوس أن <b>المهمة</b> ليست انتقاماً.</p>
            <p>روى ميمير جزءاً من <b>أساطير العالم</b> عن العمالقة الذين أخفوا أسماءهم في الحجر، وختمت فريا بتذكيرهم بأن القدر يُواجَه ولا يُهرب منه.</p>
            <div className="flex gap-2 text-[11px] text-muted-foreground"><span className="rounded bg-secondary px-2 py-0.5">{LINES.length} حوارات</span><span className="rounded bg-secondary px-2 py-0.5">24 دقيقة</span><span className="rounded bg-secondary px-2 py-0.5">4 شخصيات</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
