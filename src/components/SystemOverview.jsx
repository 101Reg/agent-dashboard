import Card from './Card'
import Num from './Num'
import Reveal from './Reveal'

const STATS = [
  { key: 'agents', label: 'Agents', icon: '🤖' },
  { key: 'skills', label: 'Skills', icon: '⚡' },
  { key: 'rules', label: 'Rules', icon: '📏' },
  { key: 'hooks', label: 'Hooks', icon: '🪝' },
  { key: 'memories', label: 'Memories', icon: '🧠' },
  { key: 'mcpServers', label: 'MCP Servers', icon: '🔌' },
]

export default function SystemOverview({ data }) {
  const counts = {
    agents: data.agentCount,
    skills: data.system.skills,
    rules: data.system.rules,
    hooks: data.system.hooks,
    memories: data.memory.total,
    mcpServers: data.system.mcpServers,
  }

  return (
    <section id="overview" style={{ marginBottom: 100, scrollMarginTop: 80 }}>
      <Reveal>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>System Overview</p>
        <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 40, lineHeight: 1.2 }}>
          The full system,<br />at a glance.
        </h2>
      </Reveal>
      <Reveal delay={100}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {STATS.map(s => (
            <Card key={s.key} style={{ padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>
                <Num value={counts[s.key]} />
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4, fontWeight: 500, letterSpacing: "0.03em" }}>{s.label}</div>
            </Card>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
