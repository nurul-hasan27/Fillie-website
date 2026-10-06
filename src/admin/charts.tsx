/** Small dependency-free SVG charts. */

export function Bars({ data, color = 'var(--blue)', height = 120 }: { data: Array<{ label: string; value: number }>; color?: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = 3;
  const w = 600;
  const bar = (w - gap * (data.length - 1)) / Math.max(1, data.length);
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${height + 18}`} role="img" aria-label="Bar chart over the last 30 days" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = Math.max(2, (d.value / max) * height);
        return (
          <g key={d.label}>
            <rect x={i * (bar + gap)} y={height - h} width={bar} height={h} rx={3} fill={color} opacity={i === data.length - 1 ? 1 : 0.78}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
          </g>
        );
      })}
      <text x="0" y={height + 14} className="chart-axis">{data[0]?.label.slice(5)}</text>
      <text x={w} y={height + 14} textAnchor="end" className="chart-axis">{data[data.length - 1]?.label.slice(5)}</text>
    </svg>
  );
}

export function HBars({ rows }: { rows: Array<{ label: string; value: number; color: string; note?: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="hbars">
      {rows.map((row) => (
        <div key={row.label} className="hbar">
          <span className="hbar-label">{row.label}</span>
          <span className="hbar-track"><i style={{ width: `${(row.value / max) * 100}%`, background: row.color }} /></span>
          <span className="hbar-value">{row.value.toLocaleString()}{row.note ? <small> {row.note}</small> : null}</span>
        </div>
      ))}
    </div>
  );
}

export function Stars({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">no rating</span>;
  return (
    <span className="stars-static" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <i key={n} data-on={value >= n - 0.25}>★</i>)}
    </span>
  );
}
