// 40x40 brand orb: the colored surface turns under a fixed highlight/shadow so
// the spin reads as a sphere rotating in place (see --animate-orb-spin).
export function Orb({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-block size-10 shrink-0 overflow-hidden rounded-full shadow-sm ${className}`}
    >
      <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#6366f1,#22d3ee,#a855f7,#f472b6,#6366f1)] motion-safe:animate-orb-spin" />
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.75),transparent_45%),radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.3),transparent_60%)]" />
    </span>
  );
}
