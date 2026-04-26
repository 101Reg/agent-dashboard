import VerbPanel from './VerbPanel'
import PairedBarChart from './PairedBarChart'

export default function FailureToPrevention({ data }) {
  const { thisWeek, lastWeek, daily, stuckFailures } = data

  const headline =
    thisWeek.conversionPct === 0 && thisWeek.failures > 0
      ? `${thisWeek.failures} failures, 0 preventions installed`
      : `${thisWeek.conversionPct}% of failures became preventions this week`

  const body = <PairedBarChart data={daily} />

  const counters = [
    {
      label: 'Failures (7d)',
      value: thisWeek.failures,
      delta: thisWeek.failures - lastWeek.failures,
      deltaDirection: 'more-is-bad',
    },
    {
      label: 'Preventions installed (7d)',
      value: thisWeek.preventions,
      delta: thisWeek.preventions - lastWeek.preventions,
      deltaDirection: 'more-is-good',
    },
    {
      label: 'Auto-installs (7d)',
      value: thisWeek.autoInstalls,
      delta: thisWeek.autoInstalls - lastWeek.autoInstalls,
      deltaDirection: 'more-is-good',
    },
  ]

  const stuckChip =
    stuckFailures.length > 0 ? `⚠ ${stuckFailures.length} stuck` : null

  return (
    <VerbPanel
      title="Failure → Prevention"
      headlineMetric={headline}
      body={body}
      counters={counters}
      stuckChip={stuckChip}
    />
  )
}
