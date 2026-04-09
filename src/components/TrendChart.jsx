import { useState } from 'react'

const METRIC_LABELS = ["Fix Attempts", "Escalations", "Re-explanations", "Capability Gaps", "Toil Events", "Hook Catches"]
const COLORS = ["#7B9FF5", "#F5B07B", "#53e16f", "#F5D27B", "#B07BF5", "#F57B7B"]

export default function TrendChart({ sessions }) {
  const [selected, setSelected] = useState(sessions.length - 1)

  if (!sessions.length) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>No session data yet.</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", marginTop: 8 }}>Metrics will appear as the OS logs performance events.</p>
      </div>
    )
  }

  const S = 320, cx = S / 2, cy = S / 2, R = 120
  const n = 6
  const keys = ['fixAttempts', 'escalations', 'reExplanations', 'capabilityGaps', 'toilEvents', 'hookCatches']
  const maxVals = keys.map(k => Math.max(...sessions.map(s => s[k]), 1))

  const getPoint = (metricIdx, val, radius) => {
    const angle = (metricIdx / n) * Math.PI * 2 - Math.PI / 2
    const norm = val / maxVals[metricIdx]
    const r = norm * radius
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }
  }

  const polyPoints = (sessionIdx, radius) =>
    keys.map((k, i) => getPoint(i, sessions[sessionIdx][k], radius)).map(p => `${p.x},${p.y}`).join(" ")

  const labels = sessions.map((s, i) => i === sessions.length - 1 ? "Now" : s.name || `S-${sessions.length - 1 - i}`)

  return (
    <div>
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 28, flexWrap: "wrap" }}>
        {labels.map((s, i) => (
          <button key={i} onClick={() => setSelected(i)} style={{
            background: selected === i ? "rgba(255,255,255,0.1)" : "none",
            border: selected === i ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
            color: selected === i ? "#fff" : "rgba(255,255,255,0.25)",
            fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 100,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.25s",
          }}>{s}</button>
        ))}
      </div>

      <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto" }}>
        {[0.25, 0.5, 0.75, 1].map(p => (
          <circle key={p} cx={cx} cy={cy} r={R * p} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {METRIC_LABELS.map((m, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2
          const lx = cx + Math.cos(angle) * (R + 24)
          const ly = cy + Math.sin(angle) * (R + 24)
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={cx + Math.cos(angle) * R} y2={cy + Math.sin(angle) * R} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="500" fill={COLORS[i]} fontFamily="Inter,system-ui">{m}</text>
            </g>
          )
        })}
        {sessions.length > 1 && (
          <polygon points={polyPoints(0, R)} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4,4" />
        )}
        <polygon
          points={polyPoints(selected, R)}
          fill="rgba(83,225,111,0.06)"
          stroke="#53e16f"
          strokeWidth="1.5"
          strokeLinejoin="round"
          style={{ transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)" }}
        />
        {keys.map((k, i) => {
          const pt = getPoint(i, sessions[selected][k], R)
          return (
            <circle key={i} cx={pt.x} cy={pt.y} r="3.5"
              fill={COLORS[i]} stroke="#0a0a0a" strokeWidth="2"
              style={{ transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)" }}
            />
          )
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#fff" fontFamily="Inter,system-ui">
          {labels[selected]}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="Inter,system-ui">
          {selected === sessions.length - 1 ? "current" : selected === 0 ? "baseline" : `${sessions.length - 1 - selected} sessions ago`}
        </text>
      </svg>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
          <span style={{ width: 12, height: 1, borderTop: "1px dashed rgba(255,255,255,0.3)", display: "inline-block" }} />
          Baseline
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
          <span style={{ width: 12, height: 2, background: "#53e16f", borderRadius: 1, display: "inline-block" }} />
          Selected session
        </span>
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 10 }}>
        Smaller polygon = better performance
      </p>
    </div>
  )
}
