export default function PairedBarChart({ data = [], width = 320, height = 100 }) {
  const allValues = data.flatMap(d => [d.failures ?? 0, d.preventions ?? 0])
  const maxVal = Math.max(...allValues, 1)

  const isEmpty = allValues.every(v => v === 0)
  if (isEmpty) {
    return (
      <div style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: 'rgba(255,255,255,0.25)',
      }}>
        No activity in window
      </div>
    )
  }

  const n = data.length
  const chartBottom = height - 20 // leave 20px for x-axis labels
  const barAreaHeight = chartBottom - 4
  const groupWidth = width / n
  const barW = Math.max(2, (groupWidth * 0.7) / 2)
  const gap = Math.max(1, groupWidth * 0.05)

  return (
    <div style={{ width, display: 'inline-block' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {data.map((d, i) => {
          const failures = d.failures ?? 0
          const preventions = d.preventions ?? 0
          const cx = (i + 0.5) * groupWidth

          const fH = (failures / maxVal) * barAreaHeight
          const pH = (preventions / maxVal) * barAreaHeight

          const fX = cx - gap / 2 - barW
          const pX = cx + gap / 2

          const showLabel = n <= 14 ? i % 2 === 0 : i % 3 === 0

          return (
            <g key={d.date ?? i}>
              {failures > 0 && (
                <rect
                  x={fX}
                  y={chartBottom - fH}
                  width={barW}
                  height={fH}
                  fill="#f55"
                  rx={1}
                >
                  <title>{d.date}: {failures} failures</title>
                </rect>
              )}
              {preventions > 0 && (
                <rect
                  x={pX}
                  y={chartBottom - pH}
                  width={barW}
                  height={pH}
                  fill="#53e16f"
                  rx={1}
                >
                  <title>{d.date}: {preventions} preventions</title>
                </rect>
              )}
              {showLabel && d.date && (
                <text
                  x={cx}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgba(255,255,255,0.25)"
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f55', display: 'inline-block' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Failures</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#53e16f', display: 'inline-block' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Preventions</span>
        </div>
      </div>
    </div>
  )
}
