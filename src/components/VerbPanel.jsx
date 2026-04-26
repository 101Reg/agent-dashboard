import WoWDelta from './WoWDelta'

export default function VerbPanel({ title, headlineMetric, body, counters = [], stuckChip = null }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.06)',
      padding: 24,
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.2)',
            marginBottom: 2,
          }}>
            Verb &rarr;
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: '-0.02em',
          }}>
            {title}
          </div>
        </div>

        {stuckChip && (
          <div style={{
            background: 'rgba(245,85,85,0.08)',
            border: '1px solid rgba(245,85,85,0.3)',
            borderRadius: 12,
            padding: '4px 10px',
            fontSize: 11,
            color: '#f55',
            whiteSpace: 'nowrap',
          }}>
            {stuckChip}
          </div>
        )}
      </div>

      {/* Headline metric */}
      <div style={{
        fontSize: 20,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.75)',
        lineHeight: 1.3,
        marginBottom: 16,
      }}>
        {headlineMetric}
      </div>

      {/* Body slot */}
      {body && (
        <div style={{ marginBottom: 16 }}>
          {body}
        </div>
      )}

      {/* Footer counters */}
      {counters.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          {counters.map((c, i) => (
            <div key={i} style={{ minWidth: 60 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.02em' }}>
                {c.value}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1, marginBottom: 3 }}>
                {c.label}
              </div>
              {c.delta !== undefined && (
                <WoWDelta
                  current={c.value}
                  previous={c.value - c.delta}
                  direction={c.deltaDirection ?? 'more-is-good'}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
