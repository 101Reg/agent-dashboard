export default function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      borderRadius: 20,
      border: "1px solid rgba(255,255,255,0.06)",
      ...style,
    }}>{children}</div>
  )
}
