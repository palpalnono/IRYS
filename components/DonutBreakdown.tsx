"use client";
// Lifted out of atoms.tsx so the rest of the atoms can stay server-rendered.
// This is the only piece that needs interactivity (hover state).

export default function DonutBreakdown({
  size = 220,
  strokeWidth = 38,
  slices,
  centerTop,
  centerBig,
  centerSub,
  hovered,
  onHover,
}: {
  size?: number;
  strokeWidth?: number;
  slices: { key: string; value: number; color: string; label: string }[];
  centerTop?: string;
  centerBig: React.ReactNode;
  centerSub?: string;
  hovered: number | null;
  onHover: (i: number | null) => void;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <div
      className="donut"
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        slices.length === 0
          ? "No not-ready units"
          : `Not ready by subsystem: ${slices
              .map((s) => `${s.label} ${s.value}`)
              .join(", ")}`
      }
    >
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        {slices.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len - 2} ${c - len + 2}`;
          const dashoffset = -offset;
          offset += len;
          const isHov = hovered === i;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={isHov ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={dash}
              strokeDashoffset={dashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ cursor: "pointer", opacity: isHov || hovered === null ? 1 : 0.55, transition: "opacity 150ms ease-out" }}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
              aria-label={`${s.label}: ${s.value} ${s.value === 1 ? "unit" : "units"}`}
            />
          );
        })}
      </svg>
      <div className="donut-center">
        {centerTop && <div className="donut-top">{centerTop}</div>}
        <div className="donut-big">{centerBig}</div>
        {centerSub && <div className="donut-sub">{centerSub}</div>}
      </div>
    </div>
  );
}
