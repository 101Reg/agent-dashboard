import { useState, useEffect } from 'react'
import { useReveal } from '../hooks/useReveal'

export default function ScoreRing({ score, status, label }) {
  const [ref, vis] = useReveal(0.08)
  const [animScore, setAnimScore] = useState(0)

  useEffect(() => {
    if (!vis) return
    const t0 = performance.now()
    const tick = t => {
      const p = Math.min((t - t0) / 1600, 1)
      setAnimScore((1 - Math.pow(1 - p, 4)) * score)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [vis, score])

  const size = 180
  const stroke = 8
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (animScore / 100) * circ

  const statusColor = status === 'GREEN' ? '#53e16f' : status === 'YELLOW' ? '#F5B07B' : '#f55'
  const ringColor = score >= 80 ? '#53e16f' : score >= 60 ? '#F5B07B' : '#f55'

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(20px)',
      transition: 'all 1.2s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)' }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>
            {Math.round(animScore)}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500, marginTop: 4 }}>/100</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, animation: 'pulse 2.5s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: statusColor }}>{status}</span>
        </div>
        {label && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{label}</div>}
      </div>
    </div>
  )
}
