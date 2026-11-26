import { useState } from "react";
import { Eye, EyeOff, Tv, Wifi } from "lucide-react";
import { Logo } from "./Logo";
import { QR } from "./QR";
import { GameScene } from "./GameScene";
import type { Line, Settings } from "./data";

export function TvView({ paired, onPair, line, idx, visible, s, setS }: {
  paired: boolean; onPair: () => void; line: Line; idx: number; visible: boolean; s: Settings; setS: (p: Partial<Settings>) => void;
}) {
  const [pin] = useState("482 915");
  if (!paired) {
    return (
      <div className="relative grid min-h-[560px] place-items-center overflow-hidden rounded-3xl border border-border mesh-bg">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <div className="relative z-10 flex flex-col items-center gap-6 p-8 text-center">
          <div className="animate-floaty"><Logo size={88} /></div>
          <div>
            <h2 className="font-display text-4xl font-bold text-gradient">سرد برو</h2>
            <p className="mt-1 font-display text-sm tracking-[0.4em] text-muted-foreground" dir="ltr">SARD PRO • TV OVERLAY</p>
          </div>
          <div className="glass relative overflow-hidden rounded-2xl p-5 glow-neon">
            <QR seed={42} />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-transparent via-neon/25 to-transparent animate-scan" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">امسح الرمز من تطبيق الآيفون أو أدخل الرمز</p>
            <p className="mt-2 font-display text-5xl font-bold tracking-[0.25em] text-neon [text-shadow:var(--glow-neon)]" dir="ltr">{pin}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> بانتظار الاقتران…
          </span>
          <button onClick={onPair} className="rounded-xl bg-gradient-neon px-6 py-2.5 font-display font-semibold text-primary-foreground glow-violet transition hover:scale-105">محاكاة الاقتران</button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Tv className="h-5 w-5 text-neon" /><span className="font-display">مخرج HDMI — الشاشة الذكية</span></div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-success"><Wifi className="h-3.5 w-3.5" /> متصل • 18ms</span>
          <button onClick={() => setS({ autoHide: !s.autoHide })} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${s.autoHide ? "bg-gradient-neon text-primary-foreground" : "glass"}`}>
            {s.autoHide ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} إخفاء تلقائي
          </button>
        </div>
      </div>
      <div className="rounded-[1.6rem] border border-border bg-obsidian p-2 shadow-2xl glow-neon">
        <GameScene>
          <div className="absolute inset-x-0 flex justify-center px-[6%] transition-all duration-500" style={{ bottom: `${s.pos}%`, opacity: visible && s.live ? 1 : 0 }}>
            <div key={idx} className="animate-subin max-w-[85%] rounded-2xl border border-foreground/15 px-[3%] py-[1.4%] text-center backdrop-blur-xl"
              style={{ background: `color-mix(in oklab, var(--obsidian) ${s.opacity}%, transparent)` }}>
              <span className="ml-2 font-display text-[0.7em] text-muted-foreground" style={{ fontSize: `${s.font * 0.045}vw` }}>{line.speaker}:</span>
              <span className="font-semibold [text-shadow:0_0_12px_currentColor]" style={{ color: s.color, fontSize: `${s.font * 0.065}vw` }}>{line.ar}</span>
            </div>
          </div>
          <div className="absolute left-3 bottom-3 opacity-70"><Logo size={22} /></div>
        </GameScene>
      </div>
    </div>
  );
}
