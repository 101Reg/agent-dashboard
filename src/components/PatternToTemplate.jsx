import VerbPanel from './VerbPanel'
import InfoCarousel from './InfoCarousel'
import { translatePatternHeading } from '../lib/translate'

const BLUE = '#7b9ff5'
const GREEN = '#53e16f'
const BRAND = '#a78bfa'

function SankeyHeadline({ patterns, templates, instantiations }) {
  return (
    <span>
      <span style={{ color: BLUE, fontWeight: 700 }}>{patterns}</span>
      {' patterns → '}
      <span style={{ color: GREEN, fontWeight: 700 }}>{templates}</span>
      {' templates → '}
      <span style={{ color: BRAND, fontWeight: 700 }}>{instantiations}</span>
      {' instantiations'}
    </span>
  )
}

function TemplateRow({ template }) {
  const { name, instantiations, lastUsed, projects } = template
  const displayProjects = (projects || []).slice(0, 4)
  const overflow = (projects || []).length - displayProjects.length

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '8px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.85)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {name}
        </div>
        <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {displayProjects.map(p => (
            <span key={p} style={{
              fontSize: 10,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              padding: '1px 5px',
              color: 'rgba(255,255,255,0.45)',
            }}>{p}</span>
          ))}
          {overflow > 0 && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>+{overflow} more</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: BRAND, lineHeight: 1 }}>{instantiations}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{lastUsed}</div>
      </div>
    </div>
  )
}

export default function PatternToTemplate({ data }) {
  const { thisWeek, lastWeek, activeTemplates, stuckPatterns } = data

  const headline = (
    <SankeyHeadline
      patterns={thisWeek.patternsDetected}
      templates={thisWeek.templatesExtracted}
      instantiations={thisWeek.templatesInstantiated}
    />
  )

  const topTemplates = (activeTemplates || []).slice(0, 3)

  const stuckCarousel = (stuckPatterns || []).length > 0 ? (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: 8,
      }}>
        Patterns waiting for template · what to tell me
      </div>
      <InfoCarousel
        panels={stuckPatterns.map((sp, i) => {
          const t = translatePatternHeading(sp.heading)
          return {
            label: `${i + 1}/${stuckPatterns.length}`,
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
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}>
                  {sp.heading}
                </div>
                {t.suggestion && (
                  <div style={{
                    fontSize: 11, color: 'rgba(167,139,250,0.85)', fontStyle: 'italic',
                    lineHeight: 1.5, padding: '8px 12px',
                    background: 'rgba(167,139,250,0.06)',
                    borderLeft: '2px solid rgba(167,139,250,0.4)', borderRadius: 4,
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
    <div>
      {topTemplates.length === 0 ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>
          No active templates yet
        </div>
      ) : (
        topTemplates.map(t => <TemplateRow key={t.name} template={t} />)
      )}
      {stuckCarousel}
    </div>
  )

  const counters = [
    {
      label: 'Patterns detected (7d)',
      value: thisWeek.patternsDetected,
      delta: thisWeek.patternsDetected - lastWeek.patternsDetected,
      deltaDirection: 'more-is-good',
    },
    {
      label: 'Templates extracted (7d)',
      value: thisWeek.templatesExtracted,
      delta: thisWeek.templatesExtracted - lastWeek.templatesExtracted,
      deltaDirection: 'more-is-good',
    },
    {
      // value is numeric so VerbPanel WoWDelta math works correctly
      label: 'Extraction rate (%)',
      value: thisWeek.extractionRate,
      delta: thisWeek.extractionRate - lastWeek.extractionRate,
      deltaDirection: 'more-is-good',
    },
  ]

  const stuckChip =
    stuckPatterns.length > 0
      ? `⚠ ${stuckPatterns.length} patterns waiting for template`
      : null

  return (
    <VerbPanel
      title="Pattern → Template"
      headlineMetric={headline}
      body={body}
      counters={counters}
      stuckChip={stuckChip}
    />
  )
}
