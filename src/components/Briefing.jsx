import Card from './Card'
import Reveal from './Reveal'
import Spark from './Spark'

const STATUS_COLORS = {
  GREEN: "#53e16f",
  YELLOW: "#F5B07B",
  RED: "#F57B7B",
}

export default function Briefing({ nightShift, sessions }) {
  if (!nightShift || !nightShift.lastRun) {
    return (
      <section id="briefing" style={{ marginBottom: 100, scrollMarginTop: 80 }}>
        <Reveal>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Night Shift</p>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 40, lineHeight: 1.2 }}>
            Overnight review<br />activates soon.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <Card style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🌙</div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>No briefing yet</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", maxWidth: 300, margin: "0 auto", lineHeight: 1.6 }}>
              The Night Shift agent runs at 3 AM — analyzing logs, running evals, and preparing your morning briefing.
            </p>
          </Card>
        </Reveal>
      </section>
    )
  }

  const { status, lastRun, findings, evalCanaries, proposalCount, actionRequired, frictionTrends, domainFrequency, agentUsage, skillGaps, memoryHealth, proposalTrackRecord } = nightShift
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.GREEN

  return (
    <section id="briefing" style={{ marginBottom: 100, scrollMarginTop: 80 }}>
      <Reveal>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Night Shift</p>
        <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 40, lineHeight: 1.2 }}>
          Morning briefing.<br />While you slept.
        </h2>
      </Reveal>

      {/* Status Badge */}
      <Reveal delay={80}>
        <Card style={{ padding: 24, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: statusColor,
                boxShadow: `0 0 12px ${statusColor}40`,
              }} />
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
                {status}
              </span>
              {actionRequired && (
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: STATUS_COLORS.RED, background: "rgba(245,123,123,0.1)",
                  padding: "3px 10px", borderRadius: 100,
                }}>
                  Action Required
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{lastRun}</span>
          </div>
        </Card>
      </Reveal>

      {/* Key Findings */}
      {findings && findings.length > 0 && (
        <Reveal delay={120}>
          <Card style={{ overflow: "hidden", marginBottom: 12 }}>
            <div style={{ padding: "16px 24px 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
              Key Findings
            </div>
            {findings.map((f, i) => (
              <div key={i} style={{
                padding: "12px 24px", display: "flex", gap: 12, alignItems: "flex-start",
                borderBottom: i < findings.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%", marginTop: 7, flexShrink: 0,
                  background: f.includes("DEGRADED") ? STATUS_COLORS.RED
                    : f.includes("WATCH") ? STATUS_COLORS.YELLOW
                    : "rgba(255,255,255,0.15)",
                }} />
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>{f}</div>
              </div>
            ))}
          </Card>
        </Reveal>
      )}

      {/* Work Domains + Agent Usage */}
      {domainFrequency && domainFrequency.length > 0 && (
        <Reveal delay={120}>
          <Card style={{ padding: 24, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>
              What Hero Worked On (7-day)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {domainFrequency.map((d, i) => (
                <div key={i} style={{
                  padding: "6px 14px", borderRadius: 100,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 12, color: "rgba(255,255,255,0.6)",
                }}>
                  {d.domain} <span style={{ color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>{d.count}</span>
                </div>
              ))}
            </div>
            {agentUsage && agentUsage.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 8, letterSpacing: "0.04em" }}>AGENTS USED</div>
                <div style={{ display: "flex", gap: 16 }}>
                  {agentUsage.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                      <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{a.agent}</span>
                      <span style={{ color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>{a.sessions}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Reveal>
      )}

      {/* Skill Gaps */}
      {skillGaps && skillGaps.length > 0 && (
        <Reveal delay={140}>
          <Card style={{ padding: 24, marginBottom: 12, border: "1px solid rgba(245,176,123,0.1)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: STATUS_COLORS.YELLOW, marginBottom: 12 }}>
              Skill Gaps Detected
            </div>
            {skillGaps.map((g, i) => (
              <div key={i} style={{
                padding: "10px 0",
                borderBottom: i < skillGaps.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{g.domain}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
                    background: g.severity === "high" ? "rgba(245,123,123,0.1)" : "rgba(245,176,123,0.1)",
                    color: g.severity === "high" ? STATUS_COLORS.RED : STATUS_COLORS.YELLOW,
                  }}>{g.severity}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{g.suggestion}</div>
              </div>
            ))}
          </Card>
        </Reveal>
      )}

      {/* Memory Health */}
      {memoryHealth && (
        <Reveal delay={150}>
          <Card style={{ padding: 24, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Memory Health</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{memoryHealth.total} <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>files</span></div>
              </div>
              {memoryHealth.consolidationCandidates?.length > 0 && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: STATUS_COLORS.YELLOW, fontWeight: 600, letterSpacing: "0.04em" }}>
                    {memoryHealth.consolidationCandidates.length} TO CONSOLIDATE
                  </div>
                  {memoryHealth.consolidationCandidates.map((c, i) => (
                    <div key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                      {c.prefix} ({c.count} files)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </Reveal>
      )}

      {/* Eval Canaries */}
      {evalCanaries && evalCanaries.length > 0 && (
        <Reveal delay={160}>
          <Card style={{ padding: 24, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>
              Eval Canaries
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {evalCanaries.map((e, i) => {
                const deltaColor = e.delta >= 0 ? STATUS_COLORS.GREEN
                  : Math.abs(e.delta) > 1.0 ? STATUS_COLORS.RED
                  : Math.abs(e.delta) > 0.5 ? STATUS_COLORS.YELLOW
                  : "rgba(255,255,255,0.4)"
                return (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{e.agent}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{e.status || "ok"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
                        {e.error ? "—" : e.score}
                      </div>
                      {!e.error && (
                        <div style={{ fontSize: 11, color: deltaColor, fontWeight: 600 }}>
                          {e.delta >= 0 ? "+" : ""}{e.delta} vs {e.baseline}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </Reveal>
      )}

      {/* Friction Trends */}
      {frictionTrends && (
        <Reveal delay={200}>
          <Card style={{ padding: 24, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>
              Friction Trends (7-day)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {Object.entries(frictionTrends).map(([key, val]) => (
                <div key={key} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{val}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.04em" }}>
                    {key.replace(/_/g, " ")}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      )}

      {/* Proposals */}
      {proposalCount > 0 && (
        <Reveal delay={240}>
          <Card style={{ padding: 24, border: "1px solid rgba(245,176,123,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: STATUS_COLORS.YELLOW }}>
                {proposalCount} Proposal{proposalCount > 1 ? "s" : ""} Pending
              </div>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>
              The Night Shift detected issues and drafted improvement proposals. Review in your next session.
            </p>
          </Card>
        </Reveal>
      )}

      {/* Proposal Track Record */}
      {proposalTrackRecord && proposalTrackRecord.total > 0 && (
        <Reveal delay={260}>
          <Card style={{ padding: 24, marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>
              Proposal Track Record
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "total", value: proposalTrackRecord.total },
                { label: "accepted", value: proposalTrackRecord.accepted, color: STATUS_COLORS.GREEN },
                { label: "pending", value: proposalTrackRecord.pending, color: STATUS_COLORS.YELLOW },
                { label: "rejected", value: proposalTrackRecord.rejected, color: STATUS_COLORS.RED },
              ].map(m => (
                <div key={m.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: m.color || "rgba(255,255,255,0.7)" }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4, letterSpacing: "0.04em" }}>{m.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      )}
    </section>
  )
}
