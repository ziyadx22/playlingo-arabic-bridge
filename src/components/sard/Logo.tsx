export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="SARD Pro" className="drop-shadow-[0_0_12px_var(--neon)]">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--neon)" />
          <stop offset="1" stopColor="var(--violet)" />
        </linearGradient>
      </defs>
      <polygon points="32,3 58,17 58,47 32,61 6,47 6,17" fill="none" stroke="url(#lg)" strokeWidth="2.5" />
      <polygon points="32,12 50,22 50,42 32,52 14,42 14,22" fill="url(#lg)" opacity=".12" />
      {/* stylized Arabic "س" wave + play triangle */}
      <path d="M16 36 q4 -8 8 0 q4 -8 8 0 q4 -8 8 0 v-10" fill="none" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 40 l8 -5 l-8 -5 z" fill="var(--neon)" />
      <circle cx="24" cy="44" r="2" fill="var(--violet)" />
    </svg>
  );
}
