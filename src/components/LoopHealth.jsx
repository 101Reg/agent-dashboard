import Num from './Num'
import WoWDelta from './WoWDelta'

export default function LoopHealth({ failureToPrevention, patternToTemplate, preventionEfficacy }) {
  const c1 = (failureToPrevention?.thisWeek?.conversionPct ?? 0) / 100
  const c2 = (patternToTemplate?.thisWeek?.extractionRate ?? 0) / 100
  const c3 = preventionEfficacy?.avgEfficacy ?? 0

  const geomMean = Math.cbrt(
    Math.max(c1, 0.01) * Math.max(c2, 0.01) * Math.max(c3, 0.01)
  )
  const score = Math.round(geomMean * 100)

  const scoreColor = score >= 70 ? '#53e16f' : score >= 40 ? '#f5e17b' : '#f55'

  const ftpThis = failureToPrevention?.thisWeek ?? {}
  const ftpLast = failureToPrevention?.lastWeek ?? {}
  const p2tThis = patternToTemplate?.thisWeek ?? {}
  const p2tLast = patternToTemplate?.lastWeek ?? {}

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.06)',
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.2)',
        marginBottom: 8,
      }}>
        Loop Health
      </div>

      <div style={{
        fontSize: 52,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        color: scoreColor,
        lineHeight: 1,
        marginBottom: 4,
      }}>
        <Num value={score} />
      </div>

      <div style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.2)',
        marginBottom: 20,
      }}>
        geometric mean of 3 conversion rates
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 32,
        flexWrap: 'wrap',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
            {ftpThis.failures ?? 0}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2, marginBottom: 4 }}>
            Failures detected
          </div>
          <WoWDelta
            current={ftpThis.failures ?? 0}
            previous={ftpLast.failures ?? 0}
            direction="more-is-bad"
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
            {ftpThis.preventions ?? 0}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2, marginBottom: 4 }}>
            Preventions installed
          </div>
          <WoWDelta
            current={ftpThis.preventions ?? 0}
            previous={ftpLast.preventions ?? 0}
            direction="more-is-good"
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
            {p2tThis.templatesExtracted ?? 0}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2, marginBottom: 4 }}>
            Templates extracted
          </div>
          <WoWDelta
            current={p2tThis.templatesExtracted ?? 0}
            previous={p2tLast.templatesExtracted ?? 0}
            direction="more-is-good"
          />
        </div>
      </div>
    </div>
  )
}
