import { useState, useEffect } from 'react'
import { useReveal } from '../hooks/useReveal'

export default function Num({ value, d = 0 }) {
  const [v, setV] = useState(0)
  const [go, setGo] = useState(false)
  const [ref, vis] = useReveal()
  useEffect(() => {
    if (vis && !go) {
      setGo(true)
      const t0 = performance.now()
      const tick = t => {
        const p = Math.min((t - t0) / 1400, 1)
        setV((1 - Math.pow(1 - p, 4)) * value)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
  }, [vis, go, value])
  return <span ref={ref}>{v.toFixed(d)}</span>
}
