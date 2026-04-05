import { useRef, useState, useEffect, useCallback } from 'react'

function hexToRgb(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(",") }

// Vibrant Obsidian-style colors
const CLUSTER_COLORS = {
  feedback: "#5B8DEF",
  project: "#EF5B8D",
  user: "#4ADE80",
  reference: "#FBBF24",
}

export default function MemoryGraph({ memory }) {
  const canvasRef = useRef(null)
  const nodesRef = useRef([])
  const edgesRef = useRef([])
  const hovRef = useRef(null)
  const animRef = useRef(null)
  const initRef = useRef(false)
  const [, setHov] = useState(null)
  const [sz, setSz] = useState({ w: 500, h: 600 })
  const cRef = useRef(null)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const clusters = Object.entries(memory.byType).filter(([, v]) => v > 0)
    // Spread clusters further apart for Obsidian-like layout
    const clusterCenters = [
      { x: 0.25, y: 0.22 },  // feedback - top left
      { x: 0.75, y: 0.28 },  // project - top right
      { x: 0.3, y: 0.72 },   // user - bottom left
      { x: 0.78, y: 0.68 },  // reference - bottom right
    ]

    const nodes = []
    const edges = []

    clusters.forEach(([type, count], ci) => {
      const color = CLUSTER_COLORS[type] || "#B07BF5"
      const labels = memory.labels?.[type] || []
      const nodeCount = Math.min(labels.length, count)
      const center = clusterCenters[ci] || { x: 0.5, y: 0.5 }

      for (let j = 0; j < nodeCount; j++) {
        const ang = (j / nodeCount) * Math.PI * 2 + (ci * 0.8)
        // Wider spread for more organic layout
        const dist = 0.06 + Math.random() * 0.18
        nodes.push({
          label: labels[j] || `${type}-${j}`,
          cluster: ci,
          color,
          tag: type,
          x: center.x + Math.cos(ang) * dist,
          y: center.y + Math.sin(ang) * dist,
          vx: 0, vy: 0,
          // Bigger nodes — hubs much bigger, regular nodes visible
          size: j === 0 ? 10 : 4 + Math.random() * 4,
          isHub: j === 0,
        })
      }
    })

    // More selective edges for cleaner look
    nodes.forEach((n, i) => nodes.forEach((m, j) => {
      if (i < j && n.cluster === m.cluster) {
        const chance = (n.isHub || m.isHub) ? .55 : .15
        if (Math.random() < chance)
          edges.push({ from: i, to: j, s: (n.isHub || m.isHub) ? .5 : .25 })
      }
    }))

    // Cross-cluster hub connections
    const hubs = nodes.map((n, i) => ({ i, ...n })).filter(n => n.isHub)
    for (let i = 0; i < hubs.length; i++)
      for (let j = i + 1; j < hubs.length; j++)
        edges.push({ from: hubs[i].i, to: hubs[j].i, s: .15 })

    nodesRef.current = nodes
    edgesRef.current = edges
  }, [memory])

  useEffect(() => {
    const el = cRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width
      // Taller canvas — closer to square for better spread
      setSz({ w, h: Math.max(400, Math.min(w * 1.1, 650)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1
    let run = true

    const clusters = Object.entries(memory.byType).filter(([, v]) => v > 0)
    const cc = [
      { x: 0.25, y: 0.22 },
      { x: 0.75, y: 0.28 },
      { x: 0.3, y: 0.72 },
      { x: 0.78, y: 0.68 },
    ]

    const sim = () => {
      if (!run) return
      const { w, h } = sz
      cv.width = w * dpr; cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const N = nodesRef.current, E = edgesRef.current, hI = hovRef.current

      // Physics — gentler forces for more stable layout
      for (let it = 0; it < 2; it++) {
        // Repulsion between all nodes
        for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
          const dx = N[j].x - N[i].x, dy = N[j].y - N[i].y
          const d = Math.sqrt(dx * dx + dy * dy) || .001
          const f = .00012 / (d * d)
          N[i].vx -= (dx / d) * f; N[i].vy -= (dy / d) * f
          N[j].vx += (dx / d) * f; N[j].vy += (dy / d) * f
        }
        // Spring attraction along edges
        E.forEach(e => {
          const a = N[e.from], b = N[e.to]
          const dx = b.x - a.x, dy = b.y - a.y
          const d = Math.sqrt(dx * dx + dy * dy) || .001
          const f = (d - .1) * .002 * e.s
          a.vx += (dx / d) * f; a.vy += (dy / d) * f
          b.vx -= (dx / d) * f; b.vy -= (dy / d) * f
        })
        // Gentle pull toward cluster center
        N.forEach(n => {
          const c = cc[n.cluster]
          if (!c) return
          n.vx += (c.x - n.x) * .0008
          n.vy += (c.y - n.y) * .0008
          n.vx *= .82; n.vy *= .82
          n.x = Math.max(.08, Math.min(.92, n.x + n.vx))
          n.y = Math.max(.06, Math.min(.94, n.y + n.vy))
        })
      }

      ctx.clearRect(0, 0, w, h)
      const conn = new Set()
      if (hI !== null) {
        conn.add(hI)
        E.forEach(e => { if (e.from === hI) conn.add(e.to); if (e.to === hI) conn.add(e.from) })
      }

      // Draw edges — thinner, subtler
      E.forEach(e => {
        const a = N[e.from], b = N[e.to]
        let al = .04 + e.s * .04, co = "rgba(255,255,255,"
        if (hI !== null) {
          if (conn.has(e.from) && conn.has(e.to)) { al = .5; co = `rgba(${hexToRgb(a.color)},` }
          else al = .008
        }
        ctx.beginPath()
        ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h)
        ctx.strokeStyle = co + al + ")"
        ctx.lineWidth = hI !== null && conn.has(e.from) && conn.has(e.to) ? 1.5 : .3
        ctx.stroke()
      })

      // Draw nodes — bigger, more vibrant, ALL labeled
      N.forEach((n, i) => {
        const nx = n.x * w, ny = n.y * h
        const isH = hI === i, isC = hI !== null && conn.has(i), dim = hI !== null && !isC

        // Glow effect
        if (!dim) {
          const gr = n.size * (isH ? 5 : isC ? 3 : 1.8)
          const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, gr)
          glow.addColorStop(0, n.color + (isH ? "60" : isC ? "35" : "18"))
          glow.addColorStop(1, n.color + "00")
          ctx.beginPath(); ctx.arc(nx, ny, gr, 0, Math.PI * 2)
          ctx.fillStyle = glow; ctx.fill()
        }

        // Node circle — bigger and more opaque
        const r = n.size * (isH ? 1.6 : 1)
        ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2)
        ctx.fillStyle = dim ? "rgba(255,255,255,0.04)" : n.color + (isH ? "ff" : isC ? "dd" : "cc")
        ctx.fill()

        // Ring on hover
        if (isH) {
          ctx.beginPath(); ctx.arc(nx, ny, r + 4, 0, Math.PI * 2)
          ctx.strokeStyle = n.color + "66"; ctx.lineWidth = 1.5; ctx.stroke()
        }

        // Hover label — fixed at bottom-center of canvas so it never clips
        if (isH) {
          const displayLabel = n.label.replace(/_/g, ' ')
          const labelX = w / 2
          const labelY = h - 28

          // Measure text for pill sizing
          ctx.font = "600 12px Inter,system-ui"
          const textW = ctx.measureText(displayLabel).width
          ctx.font = "500 10px Inter,system-ui"
          const tagW = ctx.measureText(n.tag).width
          const pillW = Math.max(textW, tagW) + 28
          const pillH = 40
          const px = labelX - pillW / 2, py = labelY - pillH / 2, pr = 10

          // Rounded rect background
          ctx.beginPath()
          ctx.moveTo(px + pr, py)
          ctx.lineTo(px + pillW - pr, py)
          ctx.arcTo(px + pillW, py, px + pillW, py + pr, pr)
          ctx.lineTo(px + pillW, py + pillH - pr)
          ctx.arcTo(px + pillW, py + pillH, px + pillW - pr, py + pillH, pr)
          ctx.lineTo(px + pr, py + pillH)
          ctx.arcTo(px, py + pillH, px, py + pillH - pr, pr)
          ctx.lineTo(px, py + pr)
          ctx.arcTo(px, py, px + pr, py, pr)
          ctx.closePath()
          ctx.fillStyle = "rgba(0,0,0,0.75)"
          ctx.fill()
          ctx.strokeStyle = n.color + "44"
          ctx.lineWidth = 1
          ctx.stroke()

          // Label text
          ctx.font = "600 12px Inter,system-ui"
          ctx.fillStyle = "#fff"
          ctx.textAlign = "center"
          ctx.fillText(displayLabel, labelX, labelY - 3)

          // Tag
          ctx.font = "500 10px Inter,system-ui"
          ctx.fillStyle = n.color + "cc"
          ctx.fillText(n.tag, labelX, labelY + 13)
        }
      })

      animRef.current = requestAnimationFrame(sim)
    }
    sim()
    return () => { run = false; cancelAnimationFrame(animRef.current) }
  }, [sz, memory])

  const onMove = useCallback(e => {
    const c = canvasRef.current; if (!c) return
    const r = c.getBoundingClientRect()
    const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height
    let cl = null, cd = .05
    nodesRef.current.forEach((n, i) => {
      const d = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2)
      if (d < cd) { cd = d; cl = i }
    })
    hovRef.current = cl; setHov(cl)
    c.style.cursor = cl !== null ? "pointer" : "default"
  }, [])

  const onLeave = useCallback(() => { hovRef.current = null; setHov(null) }, [])

  const onTouch = useCallback(e => {
    const t = e.touches[0]; if (!t) return
    const c = canvasRef.current; if (!c) return
    const r = c.getBoundingClientRect()
    const mx = (t.clientX - r.left) / r.width, my = (t.clientY - r.top) / r.height
    let cl = null, cd = .07
    nodesRef.current.forEach((n, i) => {
      const d = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2)
      if (d < cd) { cd = d; cl = i }
    })
    hovRef.current = cl; setHov(cl)
  }, [])

  const clusterEntries = Object.entries(memory.byType).filter(([, v]) => v > 0)

  return (
    <div ref={cRef} style={{ width: "100%" }}>
      <canvas ref={canvasRef} onMouseMove={onMove} onMouseLeave={onLeave}
        onTouchMove={onTouch} onTouchEnd={onLeave}
        style={{ width: "100%", height: sz.h, borderRadius: 16, display: "block" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginTop: 16 }}>
        {clusterEntries.map(([type, count]) => (
          <span key={type} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: CLUSTER_COLORS[type] || "#B07BF5",
              boxShadow: `0 0 8px ${(CLUSTER_COLORS[type] || "#B07BF5")}66`,
            }} />
            {type} <span style={{ opacity: .5 }}>{count}</span>
          </span>
        ))}
      </div>
      <p style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
        {memory.total} memory nodes
      </p>
    </div>
  )
}
