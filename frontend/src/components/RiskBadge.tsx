import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'

const RISK_COLORS: Record<string, string> = {
  LOW: '#80864A',
  MEDIUM: '#D97706',
  HIGH: '#C85D80',
}

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  label: string
}

export function RiskBadge({ level, label }: RiskBadgeProps) {
  const { language } = useLanguage()
  const color = RISK_COLORS[level] || '#C85D80'
  const prefix = level === 'HIGH' ? t(copy.riskBadge.HIGH_RISK, language) : t(copy.riskBadge[level], language)

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full border ${bodyFontClass(language)} text-xs font-bold shadow-sm`}
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
        color,
      }}
    >
      {prefix}: {label}
    </span>
  )
}
