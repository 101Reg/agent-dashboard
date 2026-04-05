import Card from './Card'
import Reveal from './Reveal'

export default function Timeline({ milestones }) {
  return (
    <section id="timeline" style={{ marginBottom: 100, scrollMarginTop: 80 }}>
      <Reveal>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Build Timeline</p>
        <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 40, lineHeight: 1.2 }}>
          17 days of building.<br />All one person.
        </h2>
      </Reveal>
      <Reveal delay={100}>
        <div style={{ position: "relative", paddingLeft: 32 }}>
          <div style={{
            position: "absolute", left: 7, top: 6, bottom: 6, width: 1.5,
            background: "linear-gradient(to bottom, rgba(123,159,245,0.3), rgba(123,159,245,0.03))",
            borderRadius: 1,
          }} />
          {milestones.map((item, i) => (
            <div key={i} style={{
              marginBottom: 28, position: "relative",
              animation: `fadeIn 0.6s ${i * 80}ms both`,
            }}>
              <div style={{
                position: "absolute", left: -28, top: 6, width: 10, height: 10, borderRadius: "50%",
                background: item.active ? "#7B9FF5" : "rgba(255,255,255,0.1)",
                border: "2px solid #0a0a0a",
              }}>
                {item.active && (
                  <div style={{
                    position: "absolute", inset: -5, borderRadius: "50%",
                    border: "1.5px solid rgba(123,159,245,0.3)",
                    animation: "pulse 2.5s infinite",
                  }} />
                )}
              </div>
              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 11, color: "#7B9FF5", fontWeight: 600, marginBottom: 4, letterSpacing: "0.03em" }}>{item.date}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.01em" }}>{item.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{item.desc}</div>
              </Card>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
