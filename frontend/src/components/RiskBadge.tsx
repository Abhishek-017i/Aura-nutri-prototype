const RISK_COLORS: Record<string, string> = {
  LOW: '#2F6B5E',
  MEDIUM: '#C98A12',
  HIGH: '#B7410E',
}

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  label: string
}

export function RiskBadge({ level, label }: RiskBadgeProps) {
  const color = RISK_COLORS[level]
  const prefix = level === 'HIGH' ? 'HIGH RISK' : level

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-data border font-sans text-sm font-medium"
      style={{
        backgroundColor: `${color}1A`,
        borderColor: color,
        color,
      }}
    >
      {prefix}: {label}
    </span>
  )
}
