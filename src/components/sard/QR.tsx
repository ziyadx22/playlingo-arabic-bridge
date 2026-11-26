export function QR({ seed = 7, size = 168 }: { seed?: number; size?: number }) {
  const n = 25; let x = seed * 9301 + 49297;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  const finder = (r: number, c: number) => [[0,0],[0,n-7],[n-7,0]].some(([a,b]) => r>=a! && r<a!+7 && c>=b! && c<b!+7);
  const cells: [number, number][] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!finder(r, c) && rnd() > 0.52) cells.push([r, c]);
  const F = ({ r, c }: { r: number; c: number }) => (<g><rect x={c} y={r} width="7" height="7" rx="1.5" fill="none" stroke="var(--neon)" /><rect x={c+2} y={r+2} width="3" height="3" rx=".6" fill="var(--violet)" /></g>);
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${n+2} ${n+2}`} className="drop-shadow-[0_0_10px_var(--neon)]">
      {cells.map(([r, c]) => <rect key={`${r}-${c}`} x={c+.1} y={r+.1} width=".8" height=".8" rx=".2" fill="var(--neon)" />)}
      <F r={0} c={0} /><F r={0} c={n-7} /><F r={n-7} c={0} />
    </svg>
  );
}
