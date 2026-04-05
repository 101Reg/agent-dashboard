import { useState, useEffect } from 'react'
import Card from './components/Card'
import Reveal from './components/Reveal'
import Num from './components/Num'
import Spark from './components/Spark'
import TrendChart from './components/TrendChart'
import AgentMap from './components/AgentMap'
import MemoryGraph from './components/MemoryGraph'
import SelfImprovementLog from './components/SelfImprovementLog'
import Timeline from './components/Timeline'
import SystemOverview from './components/SystemOverview'

const NAV_ITEMS = ["Overview", "Metrics", "Log", "Timeline", "Brain", "Agents"]

export default function App() {
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(d => { setData(d); setTimeout(() => setLoaded(true), 80) })
      .catch(() => setLoaded(true))
  }, [])

  if (!data) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0a0a", color: "#f5f5f7",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>Agent OS</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>Loading system data...</div>
        </div>
      </div>
    )
  }

  // Compute metric summaries from session data
  const sessions = data.metrics?.sessions || []
  const hasMetrics = sessions.length > 0
  const metricCards = hasMetrics ? [
    { key: "fix", label: "Fix Attempts", current: sessions[sessions.length - 1].fixAttempts, history: sessions.map(s => s.fixAttempts), unit: "this session" },
    { key: "esc", label: "Escalations", current: sessions[sessions.length - 1].escalations, history: sessions.map(s => s.escalations), unit: "this session" },
    { key: "reex", label: "Re-explanations", current: sessions[sessions.length - 1].reExplanations, history: sessions.map(s => s.reExplanations), unit: "this session" },
    { key: "gaps", label: "Capability Gaps", current: sessions[sessions.length - 1].capabilityGaps, history: sessions.map(s => s.capabilityGaps), unit: "identified" },
    { key: "toil", label: "Toil Events", current: sessions[sessions.length - 1].toilEvents, history: sessions.map(s => s.toilEvents), unit: "this session" },
  ] : []

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a", color: "#f5f5f7",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        *{box-sizing:border-box}::selection{background:rgba(123,159,245,0.2)}
        ::-webkit-scrollbar{width:0}
      `}</style>

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 100,
        background: "rgba(20,20,20,0.7)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderRadius: 100, border: "1px solid rgba(255,255,255,0.06)",
        padding: "6px 8px", display: "inline-flex", gap: 2,
        opacity: loaded ? 1 : 0, transition: "opacity 0.8s 0.3s",
      }}>
        {NAV_ITEMS.map(t => (
          <button key={t} onClick={() => document.getElementById(t.toLowerCase())?.scrollIntoView({ behavior: "smooth" })} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.5)",
            fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: 100,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.06)"; e.target.style.color = "#fff" }}
          onMouseLeave={e => { e.target.style.background = "none"; e.target.style.color = "rgba(255,255,255,0.5)" }}
          >{t}</button>
        ))}
      </nav>

      {/* Hero */}
      <header style={{
        padding: "140px 24px 80px", textAlign: "center",
        opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(20px)",
        transition: "all 1.2s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 100, padding: "5px 16px", marginBottom: 28,
          fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#53e16f", animation: "pulse 2.5s infinite" }} />
          Built by one person
        </div>
        <h1 style={{
          fontSize: "clamp(48px, 10vw, 80px)", fontWeight: 700, margin: 0,
          letterSpacing: "-0.04em", lineHeight: 1, color: "#f5f5f7",
        }}>Agent OS</h1>
        <p style={{
          fontSize: "clamp(17px, 3vw, 21px)", color: "rgba(255,255,255,0.3)",
          maxWidth: 440, margin: "20px auto 0", fontWeight: 400, lineHeight: 1.6, letterSpacing: "-0.01em",
        }}>
          A multi-agent system that builds software,<br />learns from every session, and improves itself.
        </p>
        {data.lastUpdated && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", marginTop: 16 }}>
            Last synced: {new Date(data.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
      </header>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 120px" }}>

        {/* System Overview */}
        <SystemOverview data={data} />

        {/* Metrics */}
        <section id="metrics" style={{ marginBottom: 100, scrollMarginTop: 80 }}>
          <Reveal>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Performance Metrics</p>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 40, lineHeight: 1.2 }}>
              {hasMetrics ? <>Across every session,<br />the OS is getting sharper.</> : <>Metrics activate<br />as the OS runs.</>}
            </h2>
          </Reveal>

          {hasMetrics ? (
            <>
              <Reveal delay={100}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40 }}>
                  {metricCards.map(m => {
                    const prev = m.history.length > 1 ? m.history[m.history.length - 2] : m.current
                    const pctRaw = prev !== 0 ? ((m.current - prev) / prev) * 100 : 0
                    const pct = Math.abs(pctRaw).toFixed(0)
                    const improving = pctRaw <= 0
                    return (
                      <Card key={m.key} style={{ padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500, letterSpacing: "0.03em" }}>{m.label}</span>
                          {pctRaw !== 0 && (
                            <span style={{ fontSize: 11, color: improving ? "#53e16f" : "#F5B07B", fontWeight: 600 }}>
                              {improving ? "↓" : "↑"} {pct}%
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>
                          <Num value={m.current} d={m.current % 1 !== 0 ? 1 : 0} />
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 14 }}>{m.unit}</div>
                        {m.history.length > 1 && <Spark data={m.history} color={improving ? "#53e16f" : "#F5B07B"} />}
                      </Card>
                    )
                  })}
                </div>
              </Reveal>
              <Reveal delay={200}>
                <Card style={{ padding: 32 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.01em" }}>Session-over-Session</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>All five metrics trending down. That's the story.</p>
                  <TrendChart sessions={sessions} />
                </Card>
              </Reveal>
            </>
          ) : (
            <Reveal delay={100}>
              <Card style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📊</div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>No session data yet</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", maxWidth: 300, margin: "0 auto", lineHeight: 1.6 }}>
                  As the OS logs fix attempts, escalations, and capability gaps, metrics will appear here automatically.
                </p>
              </Card>
            </Reveal>
          )}
        </section>

        {/* Self-Improvement Log */}
        <SelfImprovementLog entries={data.selfImprovement || []} />

        {/* Timeline */}
        <Timeline milestones={data.timeline || []} />

        {/* Memory Brain */}
        <section id="brain" style={{ marginBottom: 100, scrollMarginTop: 80 }}>
          <Reveal>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Memory Brain</p>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 40, lineHeight: 1.2 }}>
              Every decision, stored.<br />{data.memory.total} nodes across {Object.values(data.memory.byType).filter(v => v > 0).length} clusters.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <Card style={{ padding: 24 }}>
              <MemoryGraph memory={data.memory} />
            </Card>
          </Reveal>
        </section>

        {/* Agent Map */}
        <section id="agents" style={{ marginBottom: 100, scrollMarginTop: 80 }}>
          <Reveal>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Agent Map</p>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 40, lineHeight: 1.2 }}>
              {data.agentCount} agents route work<br />across every session.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <Card style={{ padding: 32 }}>
              <AgentMap agents={data.agents} escalationPaths={data.escalationPaths} />
            </Card>
          </Reveal>
        </section>

        {/* System Grid */}
        <section id="system" style={{ marginBottom: 60, scrollMarginTop: 80 }}>
          <Reveal>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Agents</p>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 40, lineHeight: 1.2 }}>The team underneath.</h2>
          </Reveal>
          <Reveal delay={120}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {data.agents.map(a => (
                <Card key={a.file} style={{ padding: "20px 16px", textAlign: "center" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", margin: "0 auto 10px",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, position: "relative",
                  }}>
                    {a.icon}
                    <span style={{
                      position: "absolute", top: -1, right: -1, width: 8, height: 8,
                      borderRadius: "50%", background: "#53e16f", border: "2px solid #0a0a0a",
                    }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 3, letterSpacing: "0.05em", textTransform: "uppercase" }}>{a.type}</div>
                </Card>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 40, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.15)", letterSpacing: "-0.01em" }}>
            One person. {data.agentCount} agents. Self-improving.
          </div>
        </div>
      </main>
    </div>
  )
}
