import { Eye, EyeOff, Tv, Wifi, WifiOff } from "lucide-react";
import { Logo } from "./Logo";
import { QR } from "./QR";
import { GameScene } from "./GameScene";
import type { Settings } from "./data";
import type { SubMsg } from "@/lib/sync";

export function TvView({ pin, url, paired, live, sub, visible, s, setS, onDemoPair }: {
  pin: string; url: string; paired: boolean; live: boolean; sub: SubMsg; visible: boolean; s: Settings; setS: (p: Partial<Settings>) => void; onDemoPair?: () => void;
}) {
  if (!paired) {
    return (
      <div className="relative grid min-h-[560px] place-items-center overflow-hidden rounded-3xl border border-border mesh-bg">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <div className="relative z-10 flex flex-col items-center gap-6 p-8 text-center">
          <div className="animate-floaty"><Logo size={88} /></div>
          <div>
            <h2 className="font-display text-4xl font-bold tracking-wider text-gradient" dir="ltr">MZGTA</h2>
            <p className="mt-1 font-display text-sm tracking-[0.4em] text-muted-foreground" dir="ltr">MZGTA • TV OVERLAY</p>
          </div>
          <div className="glass relative overflow-hidden rounded-2xl p-4 glow-neon">
            {url ? <QR value={url} /> : <div className="h-[180px] w-[180px]" />}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-transparent via-neon/25 to-transparent animate-scan" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">امسح الرمز بكاميرا الآيفون، أو أدخل الرمز في التطبيق</p>
            <p className="mt-2 font-display text-5xl font-bold tracking-[0.25em] text-neon [text-shadow:var(--glow-neon)]" dir="ltr">{pin.slice(0, 3)} {pin.slice(3)}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs">
            <span className={`h-2 w-2 animate-pulse rounded-full ${live ? "bg-success" : "bg-accent"}`} /> {live ? "الغرفة جاهزة — بانتظار الآيفون…" : "جارٍ تجهيز الغرفة…"}
          </span>
          {onDemoPair && <button onClick={onDemoPair} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">تجربة بدون آيفون</button>}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Tv className="h-5 w-5 text-neon" /><span className="font-display">مخرج HDMI — الشاشة الذكية</span><span className="font-display text-xs text-muted-foreground" dir="ltr">#{pin}</span></div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs ${live ? "text-success" : "text-destructive"}`}>{live ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />} {live ? "متصل مباشر" : "انقطع الاتصال"}</span>
          <button onClick={() => setS({ autoHide: !s.autoHide })} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${s.autoHide ? "bg-gradient-neon text-primary-foreground" : "glass"}`}>
            {s.autoHide ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} إخفاء تلقائي
          </button>
        </div>
      </div>
      <div className="rounded-[1.6rem] border border-border bg-obsidian p-2 shadow-2xl glow-neon">
        <GameScene>
          <div className="absolute inset-x-0 flex justify-center px-[6%] transition-all duration-500" style={{ bottom: `${s.pos}%`, opacity: visible && s.live && sub.ar ? 1 : 0 }}>
            <div key={sub.id} className="animate-subin max-w-[85%] rounded-2xl border border-foreground/15 px-[3%] py-[1.4%] text-center backdrop-blur-xl"
              style={{ background: `color-mix(in oklab, var(--obsidian) ${s.opacity}%, transparent)` }}>
              {sub.speaker && <span className="ml-2 font-display text-muted-foreground" style={{ fontSize: `${s.font * 0.045}vw` }}>{sub.speaker}:</span>}
              <span className="font-semibold [text-shadow:0_0_12px_currentColor]" style={{ color: s.color, fontSize: `${s.font * 0.065}vw` }}>{sub.ar}</span>
            </div>
          </div>
          <div className="absolute left-3 bottom-3 opacity-70"><Logo size={22} /></div>
        </GameScene>
      </div>
    </div>
  );
}
