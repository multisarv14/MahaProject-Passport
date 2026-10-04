/** Placeholder site photos for the demo: simple drawn building elevations, not real images. */
export function PhotoThumbs({ count, seed = 1 }: { count: number; seed?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => {
        const floors = 1 + ((seed + i * 3) % 4)
        const w = 30 + ((seed * 7 + i * 11) % 30)
        return (
          <svg key={i} viewBox="0 0 100 75" className="h-20 w-28 rounded border border-line bg-[#E9EEF5]" role="img" aria-label={`Site photo ${i + 1}`}>
            <rect x="0" y="60" width="100" height="15" fill="#C9CFB8" />
            <rect x={50 - w / 2} y={60 - floors * 12} width={w} height={floors * 12} fill="#D9CDB4" stroke="#8E8572" strokeWidth="0.8" />
            {Array.from({ length: floors }).map((__, f) => (
              <g key={f}>
                <rect x={50 - w / 2 + 4} y={60 - (f + 1) * 12 + 3} width="6" height="6" fill="#7B8AA3" />
                <rect x={50 + w / 2 - 10} y={60 - (f + 1) * 12 + 3} width="6" height="6" fill="#7B8AA3" />
              </g>
            ))}
            <text x="3" y="72" fontSize="6" fill="#3B4256">GPS ✓ · {i + 1}</text>
          </svg>
        )
      })}
    </div>
  )
}
