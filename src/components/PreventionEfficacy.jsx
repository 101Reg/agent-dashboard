import VerbPanel from './VerbPanel'

function InlineSparkline({ data }) {
  const WIDTH = 60
  const HEIGHT = 16
  const BAR_W = 2
  const GAP = 0

  if (!data || data.length === 0) return null

  const step = WIDTH / data.length
  const bars = data.map((v, i) => {
    if (v === null || v === undefined) return null
    const barH = Math.max(2, Math.round(v * HEIGHT))
    const x = i * step
    const y = HEIGHT - barH
    const color = v >= 0.7 ? '#53e16f' : v >= 0.4 ? '#f5b07b' : '#f55'
    return (
      <rect
        key={i}
        x={x}
        y={y}
        width={Math.max(BAR_W, step - GAP)}
        height={barH}
        fill={color}
        opacity={0.7}
      />
    )
  })

  return (
    <svg width={WIDTH} height={HEIGHT} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      {bars}
    </svg>
  )
}

function RetireChip() {
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 700,
      color: '#fff',
      background: '#f55',
      borderRadius: 4,
      padding: '1px 5px',
      letterSpacing: '0.03em',
      flexShrink: 0,
    }}>
      RETIRE?
    </span>
  )
}

function RuleRow({ rule, efficacy, fires30d, sparkline, isCandidate }) {
  const pct = Math.round(efficacy * 100)
  const pctColor = pct >= 70 ? '#53e16f' : pct >= 40 ? '#f5b07b' : '#f55'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.85)',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {rule}
      </div>

      <InlineSparkline data={sparkline} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: pctColor, minWidth: 36, textAlign: 'right' }}>
          {pct}%
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
          ({fires30d} fires)
        </span>
        {isCandidate && <RetireChip />}
      </div>
    </div>
  )
}

export default function PreventionEfficacy({ data }) {
  const {
    activePreventions,
    avgEfficacy,
    retirementCandidates,
    retirementsThisWeek,
    netActive30d,
    perRule,
  } = data

  const candidateSlugs = new Set((retirementCandidates || []).map(r => r.rule))

  const sortedRules = [...(perRule || [])].sort((a, b) => a.efficacy - b.efficacy)

  const candCount = retirementCandidates.length
  const headline =
    `${activePreventions} active preventions · avg efficacy ${Math.round(avgEfficacy * 100)}% · ` +
    `${candCount} retirement candidate${candCount === 1 ? '' : 's'}`

  const body = (
    <div>
      {sortedRules.length === 0 ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>No hook_catch events in last 30d</div>
      ) : (
        sortedRules.map(r => (
          <RuleRow
            key={r.rule}
            rule={r.rule}
            efficacy={r.efficacy}
            fires30d={r.fires30d}
            sparkline={r.sparkline}
            isCandidate={candidateSlugs.has(r.rule)}
          />
        ))
      )}
    </div>
  )

  const netPrefix = netActive30d > 0 ? '+' : ''

  const counters = [
    {
      label: 'Retirements this week',
      value: retirementsThisWeek,
    },
    {
      label: 'Net active 30d',
      value: `${netPrefix}${netActive30d}`,
    },
  ]

  return (
    <VerbPanel
      title="Prevention Efficacy"
      headlineMetric={headline}
      body={body}
      counters={counters}
      stuckChip={null}
    />
  )
}
