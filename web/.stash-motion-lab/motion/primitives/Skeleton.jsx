// Dimensions are required, not optional: a skeleton must reserve the real
// content's final size, or the swap reintroduces layout shift.
export function Skeleton({ width = '100%', height, radius = 8, className = '', style }) {
  return (
    <div
      className={`mlab-skeleton ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonLines({ lines = 3, lineHeight = 12, gap = 10, lastWidth = '60%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={lineHeight} width={i === lines - 1 ? lastWidth : '100%'} radius={6} />
      ))}
    </div>
  );
}
