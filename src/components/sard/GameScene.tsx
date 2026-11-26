import type { ReactNode } from "react";
/** Simulated 4K action game frame (pure CSS/SVG art). */
export function GameScene({
  children,
  showEnglish,
  line,
}: {
  children?: ReactNode;
  showEnglish?: boolean;
  line?: string;
}) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-obsidian">
      <svg
        viewBox="0 0 160 90"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="oklch(0.25 0.08 290)" />
            <stop offset=".6" stopColor="oklch(0.45 0.14 30)" />
            <stop offset="1" stopColor="oklch(0.2 0.05 30)" />
          </linearGradient>
          <radialGradient id="sun" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="oklch(0.95 0.12 80)" />
            <stop offset="1" stopColor="oklch(0.7 0.18 40 / 0)" />
          </radialGradient>
        </defs>
        <rect width="160" height="90" fill="url(#sky)" />
        <circle cx="110" cy="44" r="22" fill="url(#sun)" />
        <path
          d="M0 60 L20 38 L34 52 L52 28 L70 50 L90 34 L112 54 L130 30 L160 52 V90 H0Z"
          fill="oklch(0.18 0.04 280)"
        />
        <path d="M0 72 L30 58 L60 68 L95 56 L130 66 L160 60 V90 H0Z" fill="oklch(0.12 0.02 280)" />
        {/* warrior silhouette */}
        <g fill="oklch(0.06 0.01 280)" transform="translate(42 50)">
          <ellipse cx="6" cy="2" rx="3" ry="3.4" />
          <path d="M1 6 h10 l2 14 h-3 l-1 12 h-3 l-0.5 -10 l-0.5 10 h-3 l-1 -12 h-3z" />
          <path d="M11 8 l12 -9 l1 1.4 l-11 10z" />
        </g>
        {/* boss */}
        <g fill="oklch(0.08 0.02 300)" transform="translate(118 30)">
          <path d="M0 40 q2 -26 14 -30 q12 4 14 30z" />
          <circle cx="10" cy="16" r="1" fill="oklch(0.7 0.25 25)" />
          <circle cx="18" cy="16" r="1" fill="oklch(0.7 0.25 25)" />
        </g>
        {Array.from({ length: 30 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 37) % 160}
            cy={(i * 23) % 70}
            r=".35"
            fill="oklch(0.9 0.15 60)"
            opacity=".7"
          />
        ))}
      </svg>
      {/* HUD */}
      <div
        className="absolute left-3 top-3 flex items-center gap-2 font-display text-[10px] text-foreground/80"
        dir="ltr"
      >
        <div className="h-1.5 w-24 overflow-hidden rounded bg-foreground/20">
          <div className="h-full w-3/4 bg-destructive" />
        </div>
        <span>HP</span>
      </div>
      <div
        className="absolute right-3 top-3 rounded bg-obsidian/60 px-2 py-0.5 font-display text-[10px] text-foreground/80"
        dir="ltr"
      >
        4K • HDR • 60FPS
      </div>
      {showEnglish && line && (
        <div
          className="absolute inset-x-0 bottom-[7%] text-center font-display text-xs text-foreground"
          dir="ltr"
        >
          {line}
        </div>
      )}
      {children}
    </div>
  );
}
