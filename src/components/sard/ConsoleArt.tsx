/** Lightweight product silhouette, not a simulated stream. */
export function ConsoleArt({ xbox = false, large = false }: { xbox?: boolean; large?: boolean }) {
  return (
    <svg
      viewBox="0 0 160 130"
      role="img"
      aria-label={xbox ? "Xbox Series X" : "PlayStation 5"}
      className={`${large ? "h-36 w-44" : "h-24 w-28"} shrink-0 text-phone-hardware`}
    >
      {xbox ? (
        <>
          <path d="M52 18 103 10 116 22v94l-64 7Z" fill="currentColor" opacity=".28" />
          <path d="m52 18 64 4v94l-64 7Z" fill="currentColor" opacity=".5" />
          <circle cx="102" cy="35" r="4" className="fill-phone-primary" />
          {[0, 1, 2, 3, 4].map((n) => (
            <path
              key={n}
              d={`m${60 + n * 9} 15 0 5`}
              className="stroke-phone-primary"
              strokeWidth="3"
            />
          ))}
        </>
      ) : (
        <>
          <path d="M63 16 82 9 89 111 67 120Z" className="fill-phone-background" />
          <path d="M60 14Q53 69 47 112l19 11Q75 67 71 9Z" fill="currentColor" />
          <path d="M85 10Q106 51 108 115l-18 8Q80 62 81 12Z" fill="currentColor" opacity=".88" />
          <path d="m73 18 2 90m7-90 6 92" className="stroke-phone-primary" strokeWidth="2" />
          <path d="m92 97 9-2" className="stroke-phone-background" strokeWidth="2" />
          <path d="M65 123h30" className="stroke-phone-muted" strokeWidth="3" />
        </>
      )}
      <path
        d="M96 89q7-10 16-7l20 2q10 1 16 20l-4 10q-5 3-11-9l-19-2q-12 12-17 7Z"
        fill="currentColor"
      />
      <path d="M109 89v9m-5-5h10" className="stroke-phone-background" strokeWidth="2" />
      <circle cx="133" cy="94" r="2" className="fill-phone-primary" />
      <circle cx="127" cy="90" r="2" className="fill-phone-primary" />
    </svg>
  );
}
