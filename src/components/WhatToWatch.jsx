const STATUS_COLOR = {
  red: '#f55',
  yellow: '#f5d27b',
  green: '#53e16f',
}

const STATUS_BG = {
  red: 'rgba(245,85,85,0.08)',
  yellow: 'rgba(245,210,123,0.08)',
  green: 'rgba(83,225,111,0.08)',
}

const STATUS_BORDER = {
  red: 'rgba(245,85,85,0.25)',
  yellow: 'rgba(245,210,123,0.25)',
  green: 'rgba(83,225,111,0.25)',
}

function WatchRow({ item }) {
  const dot = STATUS_COLOR[item.status] || '#888'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '14px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: 4,
        background: dot,
        flexShrink: 0,
        marginTop: 6,
        boxShadow: `0 0 8px ${dot}`,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.85)',
          marginBottom: 4,
        }}>
          {item.title}
        </div>
        <div style={{
          display: 'flex',
          gap: 12,
          fontSize: 11,
          marginBottom: 6,
          flexWrap: 'wrap',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>now: </span>
            {item.current}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>target: </span>
            {item.target}
          </span>
        </div>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.5,
        }}>
          {item.why}
        </div>
      </div>
    </div>
  )
}

export default function WhatToWatch({ items = [] }) {
  if (items.length === 0) return null

  const counts = items.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1
    return acc
  }, {})

  // Sort red → yellow → green so attention items surface first
  const order = { red: 0, yellow: 1, green: 2 }
  const sorted = [...items].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3))

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.06)',
      padding: '20px 24px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.2)',
        }}>
          What to watch this week
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['red', 'yellow', 'green'].map(s => counts[s] ? (
            <span key={s} style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              background: STATUS_BG[s],
              border: `1px solid ${STATUS_BORDER[s]}`,
              color: STATUS_COLOR[s],
            }}>
              {counts[s]}
            </span>
          ) : null)}
        </div>
      </div>
      <div style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
        marginBottom: 12,
      }}>
        derived from current loop state · sorted attention-first
      </div>
      <div>
        {sorted.map(item => <WatchRow key={item.id} item={item} />)}
      </div>
    </div>
  )
}
