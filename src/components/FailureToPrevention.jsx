import VerbPanel from './VerbPanel'
import PairedBarChart from './PairedBarChart'
import InfoCarousel from './InfoCarousel'
import { translateStuckDetail } from '../lib/translate'

export default function FailureToPrevention({ data }) {
  const { thisWeek, lastWeek, daily, stuckFailures } = data

  const headline =
    thisWeek.conversionPct === 0 && thisWeek.failures > 0
      ? `${thisWeek.failures} failures, 0 preventions installed`
      : `${thisWeek.conversionPct}% of failures became preventions this week`

  const stuckCarousel = stuckFailures.length > 0 ? (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: 8,
      }}>
        Stuck failures · what to tell me
      </div>
      <InfoCarousel
        panels={stuckFailures.map((sf, i) => {
          const t = translateStuckDetail(sf.detail)
          return {
            label: `${i + 1}/${stuckFailures.length}`,
            content: (
              <div>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.4, marginBottom: 10,
                }}>
                  {t.summary}
                </div>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 12,
                }}>
                  {sf.session} · {sf.age_days} days ago
                </div>
                {t.suggestion && (
                  <div style={{
                    fontSize: 11, color: 'rgba(123,159,245,0.85)', fontStyle: 'italic',
                    lineHeight: 1.5, padding: '8px 12px',
                    background: 'rgba(123,159,245,0.06)',
                    borderLeft: '2px solid rgba(123,159,245,0.4)', borderRadius: 4,
                  }}>
                    {t.suggestion}
                  </div>
                )}
              </div>
            ),
          }
        })}
      />
    </div>
  ) : null

  const body = (
    <>
      <PairedBarChart data={daily} />
      {stuckCarousel}
    </>
  )

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
