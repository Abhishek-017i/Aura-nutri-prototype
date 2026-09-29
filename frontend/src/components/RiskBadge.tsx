import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'

const RISK_COLORS: Record<string, string> = {
  LOW: '#5F8A68',
  MEDIUM: '#C8953D',
  HIGH: '#C96B67',
}

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  label: string
}

export function RiskBadge({ level, label }: RiskBadgeProps) {
  const { language } = useLanguage()
  const color = RISK_COLORS[level]
  const prefix = level === 'HIGH' ? t(copy.riskBadge.HIGH_RISK, language) : t(copy.riskBadge[level], language)

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-data border ${bodyFontClass(language)} text-sm font-medium`}
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
