import { useState, useEffect } from 'react'
import Reveal from './components/Reveal'
import LoopHealth from './components/LoopHealth'
import FailureToPrevention from './components/FailureToPrevention'
import PatternToTemplate from './components/PatternToTemplate'
import PreventionEfficacy from './components/PreventionEfficacy'
import WhatToWatch from './components/WhatToWatch'

export default function App() {
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)

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

  const ns = data.nightShift || {}
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

      <main style={{
        maxWidth: 640, margin: '0 auto',
        padding: 'calc(env(safe-area-inset-top, 0px) + 32px) 20px 120px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>

        {/* Header */}
        <div style={{
          textAlign: 'center', marginBottom: 32,
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

        <Reveal delay={0}>
          <LoopHealth
            failureToPrevention={data.failureToPrevention}
            patternToTemplate={data.patternToTemplate}
            preventionEfficacy={data.preventionEfficacy}
          />
        </Reveal>

        <Reveal delay={100}>
          <FailureToPrevention data={data.failureToPrevention} />
        </Reveal>

        <Reveal delay={200}>
          <PatternToTemplate data={data.patternToTemplate} />
        </Reveal>

        <Reveal delay={300}>
          <PreventionEfficacy data={data.preventionEfficacy} />
        </Reveal>

        <Reveal delay={400}>
          <WhatToWatch items={data.watchItems} />
        </Reveal>

        {/* Proposals Card */}
        <Reveal delay={500}>
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
                No pending proposals · Run /bruce to generate
              </div>
            )}
          </div>
        </Reveal>
      </main>
    </div>
  )
}
