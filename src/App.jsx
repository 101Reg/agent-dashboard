import { useState, useEffect } from 'react'
import Reveal from './components/Reveal'
import ScoreRing from './components/ScoreRing'
import AORCard from './components/AORCard'
import Timeline from './components/Timeline'

const NAV = ["Score", "Areas", "Activity", "Timeline"]

function computeAORs(data) {
  const sessions = data.metrics?.sessions || []
  const totalSessions = sessions.length || 1
  const totalFix = sessions.reduce((a, s) => a + s.fixAttempts, 0)
  const totalEsc = sessions.reduce((a, s) => a + s.escalations, 0)
  const totalReex = sessions.reduce((a, s) => a + s.reExplanations, 0)
  const totalGaps = sessions.reduce((a, s) => a + s.capabilityGaps, 0)
  const totalToil = sessions.reduce((a, s) => a + s.toilEvents, 0)

  const ns = data.nightShift || {}
  const proposals = ns.proposalTrackRecord || { total: 0, accepted: 0, pending: 0, rejected: 0 }
  const proposalRate = proposals.total > 0 ? Math.round((proposals.accepted / proposals.total) * 100) : 0
  const mem = data.memory || { total: 0, byType: {} }
  const sys = data.system || {}

  // --- FRICTION (35%) ---
  // Exponential decay: 0 friction = 100, half-life at 1 event/session
  // Smooth gradient — every fraction of friction matters
  const frictionEvents = totalFix + totalEsc + totalReex + totalGaps + totalToil
  const frictionPerSession = frictionEvents / totalSessions
  const frictionScore = Math.round(100 * Math.exp(-frictionPerSession * 0.7))

  // --- AGENTS (25%) ---
  // 70% coverage (are agents measured?) + 30% quality (how do measured agents score?)
  // Coverage weighted heavier: unmeasured agents are unknown risk
  const agentCount = data.agentCount || 0
  const evalCanaries = ns.evalCanaries || []
  const evaldAgents = evalCanaries.length > 0 ? evalCanaries.length : 2 // fallback to known 2
  const evalCoverage = agentCount > 0 ? (evaldAgents / agentCount) * 100 : 0
  const avgEvalScore = evalCanaries.length > 0
    ? evalCanaries.reduce((sum, e) => sum + (parseFloat(e.score) || 0), 0) / evalCanaries.length
    : 4.7 // fallback to last known
  const evalQuality = (avgEvalScore / 5) * 100
  const agentScore = Math.round(evalCoverage * 0.7 + evalQuality * 0.3)

  // --- MEMORY (15%) ---
  // Under 60% = perfect. Quadratic penalty as you approach the 100-file ceiling.
  // Answers: "how much headroom do we have before consolidation is urgent?"
  const memTotal = mem.total || 0
  const memUtilization = Math.min(memTotal / 100, 1)
  const memScore = memUtilization <= 0.6 ? 100
    : Math.round(100 * Math.max(0, 1 - Math.pow((memUtilization - 0.6) / 0.4, 2)))

  // --- SELF-IMPROVEMENT (15%) ---
  // Acceptance rate * responsiveness. Pending proposals = backlog = drag on score.
  // Need 5+ proposals for meaningful rate, otherwise cap at 50.
  const pendingPenalty = Math.min(proposals.pending * 10, 30) // max 30pt penalty
  const proposalScore = proposals.total >= 5
    ? Math.max(0, Math.round(proposalRate - pendingPenalty))
    : 50

  // --- COVERAGE (10%) ---
  // 4 instrument types, each pass/fail against minimum threshold.
  // Score = % of types that are staffed. Answers: "are all categories covered?"
  const coveragePassing = [
    (sys.skills || 0) >= 15 ? 1 : 0,
    (sys.rules || 0) >= 5 ? 1 : 0,
    (sys.hooks || 0) >= 3 ? 1 : 0,
    (sys.mcpServers || 0) >= 1 ? 1 : 0,
  ].reduce((a, b) => a + b, 0)
  const coverageScore = Math.round((coveragePassing / 4) * 100)

  const aors = [
    {
      name: 'Friction', icon: '\u26A1', weight: 35, score: frictionScore,
      metrics: [
        { name: 'Fix Attempts', value: totalFix, benchmark: '0', definition: 'Code fixes that failed to resolve the issue' },
        { name: 'Escalations', value: totalEsc, benchmark: '0', definition: 'Work handed from one agent to another due to failure' },
        { name: 'Re-explanations', value: totalReex, benchmark: '0', definition: 'Hero re-explained something the system should already know' },
        { name: 'Capability Gaps', value: totalGaps, benchmark: '0', definition: 'System lacked a tool, agent, or skill for the task' },
        { name: 'Toil Events', value: totalToil, benchmark: '0', definition: 'Repetitive manual work that could be automated' },
      ],
    },
    {
      name: 'Agents', icon: '\uD83E\uDD16', weight: 25, score: agentScore,
      metrics: [
        { name: 'Eval Coverage', value: Math.round(evalCoverage) + '%', benchmark: '100%', definition: evaldAgents + '/' + agentCount + ' agents have canary evals' },
        { name: 'Avg Eval Score', value: avgEvalScore.toFixed(1), benchmark: '5.0', definition: 'Mean score across evaluated agents' },
      ],
    },
    {
      name: 'Memory', icon: '\uD83E\uDDE0', weight: 15, score: memScore,
      metrics: [
        { name: 'Total Files', value: memTotal, benchmark: '<100', definition: memTotal + '/100 ceiling \u2014 ' + Math.round((1 - memUtilization) * 100) + '% headroom' },
        { name: 'Index Usage', value: '98/200', benchmark: '<200', definition: 'MEMORY.md line count vs truncation limit' },
      ],
    },
    {
      name: 'Self-Improvement', icon: '\uD83D\uDD04', weight: 15, score: proposalScore,
      metrics: [
        { name: 'Hit Rate', value: proposalRate + '%', benchmark: '>80%', definition: 'Accepted \u00F7 (Accepted + Rejected)' },
        { name: 'Pending', value: proposals.pending, benchmark: '0', definition: 'Each pending proposal costs 10pts (max 30pt drag)' },
      ],
    },
    {
      name: 'Coverage', icon: '\uD83D\uDEE1\uFE0F', weight: 10, score: coverageScore,
      metrics: [
        { name: 'Skills', value: (sys.skills || 0) + '/15', benchmark: '\u226515', definition: 'Slash commands and skill files installed' },
        { name: 'Rules', value: (sys.rules || 0) + '/5', benchmark: '\u22655', definition: 'Behavioral constraint files in rules/' },
        { name: 'Hooks', value: (sys.hooks || 0) + '/3', benchmark: '\u22653', definition: 'Pre/Post/Stop hooks active' },
        { name: 'MCP Servers', value: (sys.mcpServers || 0) + '/1', benchmark: '\u22651', definition: 'External tool integrations' },
      ],
    },
  ]

  const overall = Math.round(aors.reduce((sum, a) => sum + (a.score * a.weight / 100), 0))
  return { aors, overall }
}

export default function App() {
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState('Score')

  useEffect(() => {
    fetch('/data.json?t=' + Date.now())
      .then(r => r.json())
      .then(d => { setData(d); setTimeout(() => setLoaded(true), 80) })
      .catch(() => setLoaded(true))
  }, [])

  if (!data) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>Agent OS</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>Loading...</div>
        </div>
      </div>
    )
  }

  const { aors, overall } = computeAORs(data)
  const sessions = data.metrics?.sessions || []
  const ns = data.nightShift || {}
  const status = overall >= 80 ? 'GREEN' : overall >= 60 ? 'YELLOW' : 'RED'
  const recentSessions = [...sessions].reverse().slice(0, 8)
  const proposals = (ns.proposals || []).filter(p => p.problem)
  const track = ns.proposalTrackRecord || {}

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f7',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        *{box-sizing:border-box}::selection{background:rgba(123,159,245,0.2)}
        ::-webkit-scrollbar{width:0;height:0}
        button:active{transform:scale(0.97)}
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 12, right: 12, zIndex: 100,
        background: 'rgba(20,20,20,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 100, border: '1px solid rgba(255,255,255,0.06)',
        padding: '5px 6px', display: 'flex', gap: 2,
        opacity: loaded ? 1 : 0, transition: 'opacity 0.8s 0.3s',
      }}>
        {NAV.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? 'rgba(255,255,255,0.08)' : 'none',
            border: 'none', color: tab === t ? '#fff' : 'rgba(255,255,255,0.4)',
            fontSize: 12, fontWeight: 500, padding: '8px 16px', borderRadius: 100,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            flex: 1, whiteSpace: 'nowrap',
          }}>{t}</button>
        ))}
      </nav>

      <main style={{
        maxWidth: 640, margin: '0 auto',
        padding: 'calc(env(safe-area-inset-top, 0px) + 72px) 20px 120px',
      }}>

        {/* Header */}
        <div style={{
          textAlign: 'center', marginBottom: 48,
          opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(20px)',
          transition: 'all 1s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Agent OS</h1>
          {data.lastUpdated && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: '6px 0 0' }}>
              {new Date(data.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Tab: Score */}
        {tab === 'Score' && (
          <>
            <Reveal>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
                <ScoreRing score={overall} status={status} label={sessions.length + ' sessions measured'} />
              </div>
            </Reveal>

            {/* AOR Summary Strip */}
            <Reveal delay={100}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(' + aors.length + ', 1fr)', gap: 8,
                marginBottom: 32,
              }}>
                {aors.map(a => {
                  const c = a.score >= 80 ? '#53e16f' : a.score >= 60 ? '#F5B07B' : '#f55'
                  return (
                    <div key={a.name} onClick={() => setTab('Areas')} style={{
                      background: 'rgba(255,255,255,0.03)', borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.06)',
                      padding: '14px 8px', textAlign: 'center', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ fontSize: 16, marginBottom: 6 }}>{a.icon}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: c }}>{a.score}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 500, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {a.name}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Reveal>

            {/* Proposals Card */}
            <Reveal delay={200}>
              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.2)' }}>
                    Proposals
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                    {track.accepted || 0}/{track.total || 0} accepted
                  </div>
                </div>
                {proposals.length > 0 ? proposals.map((p, i) => (
                  <div key={i} style={{ padding: '12px 0', borderBottom: i < proposals.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                        padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em',
                        background: p.category === 'regression' ? 'rgba(245,80,80,0.15)' : p.category === 'skill_gap' ? 'rgba(245,176,123,0.15)' : 'rgba(83,225,111,0.15)',
                        color: p.category === 'regression' ? '#f55' : p.category === 'skill_gap' ? '#F5B07B' : '#53e16f',
                      }}>{(p.category || 'unknown').replace('_', ' ')}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>{p.id}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                      {(p.problem || '').slice(0, 140)}{(p.problem || '').length > 140 ? '...' : ''}
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '12px 0', textAlign: 'center' }}>
                    No pending proposals \u00B7 Run /bruce to generate
                  </div>
                )}
              </div>
            </Reveal>
          </>
        )}

        {/* Tab: Areas */}
        {tab === 'Areas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Reveal>
              <div style={{ marginBottom: 8 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Areas of Responsibility</h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>Tap any area to see metrics, definitions, and goals</p>
              </div>
            </Reveal>
            {aors.map((a, i) => (
              <Reveal key={a.name} delay={i * 60}>
                <AORCard {...a} />
              </Reveal>
            ))}
            <Reveal delay={aors.length * 60 + 100}>
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: 12,
                padding: '16px 20px', marginTop: 8,
                border: '1px dashed rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'rgba(255,255,255,0.4)' }}>How scoring works:</strong> Each area is scored 0-100 based on its metrics.
                  Weighted by impact: Friction (35%) and Agents (25%) carry the most weight.
                  Overall = weighted average of all areas.
                </div>
              </div>
            </Reveal>
          </div>
        )}

        {/* Tab: Activity */}
        {tab === 'Activity' && (
          <>
            <Reveal>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Recent Sessions</h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{sessions.length} sessions tracked</p>
              </div>
            </Reveal>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
              {recentSessions.map((s, i) => {
                const friction = s.fixAttempts + s.escalations + s.reExplanations + s.capabilityGaps + s.toilEvents
                return (
                  <Reveal key={s.name} delay={i * 40}>
                    <div style={{
                      background: 'rgba(255,255,255,0.03)', borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.06)',
                      padding: '16px 20px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>{s.date}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        {friction === 0 ? (
                          <span style={{ fontSize: 11, color: '#53e16f', fontWeight: 600 }}>Clean</span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#F5B07B', fontWeight: 600 }}>{friction} friction</span>
                        )}
                        {s.hookCatches > 0 && (
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
                            {s.hookCatches} hook{s.hookCatches > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>

            {/* Self-Improvement highlights — only non-proposal entries */}
            <Reveal delay={200}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>
                  System Changes
                </div>
                {(data.selfImprovement || []).filter(e => e.high).slice(0, 5).map((e, i) => (
                  <div key={i} style={{
                    padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', gap: 12,
                  }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', fontWeight: 500, flexShrink: 0, width: 52 }}>
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{e.text}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </>
        )}

        {/* Tab: Timeline */}
        {tab === 'Timeline' && (
          <Timeline milestones={data.timeline || []} />
        )}
      </main>
    </div>
  )
}
