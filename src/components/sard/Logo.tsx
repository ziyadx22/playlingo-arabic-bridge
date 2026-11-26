/** MZGTA emblem: neon hexagon with an angular M/Z monogram and a play notch. */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="MZGTA" className="drop-shadow-[0_0_12px_var(--neon)]">
      <defs>
        <linearGradient id="mz" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--neon)" />
          <stop offset="1" stopColor="var(--violet)" />
        </linearGradient>
      </defs>
      <polygon points="32,3 58,17 58,47 32,61 6,47 6,17" fill="none" stroke="url(#mz)" strokeWidth="2.5" />
      <polygon points="32,11 51,21.5 51,42.5 32,53 13,42.5 13,21.5" fill="url(#mz)" opacity=".1" />
      {/* M flowing into Z */}
      <path d="M15 41 V23 L23 32 L31 23 V41" fill="none" stroke="var(--neon)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 23 H49 L35 41 H49" fill="none" stroke="url(#mz)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="50" r="1.6" fill="var(--neon)" />
      <path d="M28 14 h8" stroke="var(--violet)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
