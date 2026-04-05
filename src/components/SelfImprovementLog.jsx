import Card from './Card'
import Reveal from './Reveal'

export default function SelfImprovementLog({ entries }) {
  if (!entries.length) {
    return (
      <section id="log" style={{ marginBottom: 100, scrollMarginTop: 80 }}>
        <Reveal>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Self-Improvement</p>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 40, lineHeight: 1.2 }}>
            The OS finds its own gaps.<br />Then fixes them.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <Card style={{ padding: 40, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>No entries yet. The system will log patterns as it detects them.</p>
          </Card>
        </Reveal>
      </section>
    )
  }

  return (
    <section id="log" style={{ marginBottom: 100, scrollMarginTop: 80 }}>
      <Reveal>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Self-Improvement</p>
        <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 40, lineHeight: 1.2 }}>
          The OS finds its own gaps.<br />Then fixes them.
        </h2>
      </Reveal>
      <Reveal delay={100}>
        <Card style={{ overflow: "hidden" }}>
          {entries.map((item, i) => (
            <div key={i} style={{
              padding: "20px 24px", display: "flex", gap: 16, alignItems: "flex-start",
              borderBottom: i < entries.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", marginTop: 7, flexShrink: 0,
                background: item.high ? "#7B9FF5" : "rgba(255,255,255,0.15)",
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.75)" }}>{item.text}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>{item.date}</div>
              </div>
            </div>
          ))}
        </Card>
      </Reveal>
    </section>
  )
}
