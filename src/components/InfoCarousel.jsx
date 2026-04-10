import { useState, useRef } from 'react'

export default function InfoCarousel({ panels }) {
  const [active, setActive] = useState(0)
  const scrollRef = useRef(null)

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, clientWidth } = scrollRef.current
    const idx = Math.round(scrollLeft / clientWidth)
    if (idx !== active) setActive(idx)
  }

  const goTo = (idx) => {
    setActive(idx)
    scrollRef.current?.scrollTo({ left: idx * scrollRef.current.clientWidth, behavior: 'smooth' })
  }

  return (
    <div>
      {/* Tab pills */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 12,
        padding: '3px 4px', background: 'rgba(255,255,255,0.03)',
        borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
        width: 'fit-content',
      }}>
        {panels.map((p, i) => (
          <button key={i} onClick={() => goTo(i)} style={{
            background: active === i ? 'rgba(255,255,255,0.08)' : 'none',
            border: 'none', color: active === i ? '#fff' : 'rgba(255,255,255,0.3)',
            fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch', borderRadius: 16,
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}
      >
        <style>{`.info-scroll::-webkit-scrollbar{display:none}`}</style>
        {panels.map((p, i) => (
          <div key={i} className="info-scroll" style={{
            minWidth: '100%', scrollSnapAlign: 'start',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: '20px 24px',
          }}>
            {p.content}
          </div>
        ))}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        {panels.map((_, i) => (
          <div key={i} onClick={() => goTo(i)} style={{
            width: active === i ? 16 : 5, height: 5, borderRadius: 3,
            background: active === i ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s', cursor: 'pointer',
          }} />
        ))}
      </div>
    </div>
  )
}
