import { useState } from 'react'

export default function AORCard({ name, score, weight, metrics, icon, status }) {
  const [open, setOpen] = useState(false)

  const barColor = score >= 80 ? '#53e16f' : score >= 60 ? '#F5B07B' : '#f55'
  const statusLabel = score >= 80 ? 'On Track' : score >= 60 ? 'Watch' : 'At Risk'

  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 24px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        ...(open ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' } : {}),
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
              Weight: {weight}% · {statusLabel}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: barColor }}>{score}</span>
          <svg width={16} height={16} style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s', opacity: 0.3,
          }}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Score bar */}
      <div style={{
        marginTop: 14, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${score}%`, background: barColor, borderRadius: 2,
          transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>

      {/* Expandable metrics */}
      <div style={{
        maxHeight: open ? 600 : 0, overflow: 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ paddingTop: 20 }}>
          {metrics.filter(m => m.benchmark && m.benchmark !== '—').map((m, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '10px 0',
              borderTop: i === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2, maxWidth: 320 }}>
                  {m.definition}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{m.value}</div>
                {m.benchmark && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                    Goal: {m.benchmark}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
