import { useState } from 'react'

export default function AgentMap({ agents, escalationPaths }) {
  const [hov, setHov] = useState(null)
  const W = 420, H = 400, cx = W / 2, cy = H / 2, R = 155
  const pos = agents.map((_, i) => {
    const a = (i / agents.length) * Math.PI * 2 - Math.PI / 2
    return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 420, display: "block", margin: "0 auto" }}>
      <defs>
        <radialGradient id="mg">
          <stop offset="0%" stopColor="#7B9FF5" stopOpacity=".06" />
          <stop offset="100%" stopColor="#7B9FF5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R + 30} fill="url(#mg)" />

      {escalationPaths.map((p, i) => {
        const fi = agents.findIndex(a => a.file === p.from)
        const ti = agents.findIndex(a => a.file === p.to)
        if (fi < 0 || ti < 0) return null
        const base = p.freq === "high" ? .25 : p.freq === "medium" ? .12 : .06
        const op = hov !== null ? (hov === fi || hov === ti ? base * 3.5 : base * .15) : base
        return (
          <line key={i} x1={pos[fi].x} y1={pos[fi].y} x2={pos[ti].x} y2={pos[ti].y}
            stroke="#7B9FF5" strokeWidth={p.freq === "high" ? 1.5 : 1} opacity={op}
            style={{ transition: "opacity 0.4s" }} />
        )
      })}

      {agents.map((a, i) => {
        const h = hov === i, p = pos[i]
        return (
          <g key={a.file} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            onTouchStart={() => setHov(i)} onTouchEnd={() => setHov(null)}
            style={{ cursor: "pointer" }}>
            <circle cx={p.x} cy={p.y} r={h ? 26 : 22}
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(123,159,245,0.4)"
              strokeWidth={h ? 1.5 : 1}
              style={{ transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)" }} />
            <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="central" fontSize="16">{a.icon}</text>
            <circle cx={p.x + 15} cy={p.y - 15} r="3.5" fill="#53e16f">
              <animate attributeName="opacity" values="1;.3;1" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <text x={p.x} y={p.y + 38} textAnchor="middle" fontSize={h ? 10 : 9}
              fontWeight={h ? 600 : 400} fill={h ? "#fff" : "rgba(255,255,255,0.35)"}
              fontFamily="Inter,system-ui" style={{ transition: "all 0.3s" }}>{a.name}</text>
            {h && (
              <text x={p.x} y={p.y + 50} textAnchor="middle" fontSize="8"
                fill="rgba(255,255,255,0.2)" fontFamily="Inter,system-ui">{a.type}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
