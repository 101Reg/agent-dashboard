export default function WoWDelta({ current, previous, direction = 'more-is-good', format = 'number' }) {
  const delta = current - previous

  if (delta === 0) {
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.25)' }}>
        &mdash;
      </span>
    )
  }

  const positiveIsGood = direction === 'more-is-good'
  const isPositive = delta > 0
  const isGood = positiveIsGood ? isPositive : !isPositive
  const color = isGood ? '#53e16f' : '#f55'
  const arrow = isPositive ? '↑' : '↓'
  const sign = isPositive ? '+' : ''

  const formatted = format === 'percent'
    ? `${sign}${delta.toFixed(1)}%`
    : `${sign}${delta}`

  return (
    <span style={{ fontSize: 11, fontWeight: 600, color }}>
      {arrow}{formatted}
    </span>
  )
}
