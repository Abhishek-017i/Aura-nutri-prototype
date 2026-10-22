import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'

const RISK_CLASSES: Record<string, string> = {
  LOW: 'bg-emerald/10 border-emerald text-emerald',
  MEDIUM: 'bg-amber/10 border-amber text-amber',
  HIGH: 'bg-rose/10 border-rose text-rose',
}

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  label: string
}

export function RiskBadge({ level, label }: RiskBadgeProps) {
  const { language } = useLanguage()
  const badgeClass = RISK_CLASSES[level] || RISK_CLASSES.LOW
  const prefix = level === 'HIGH' ? t(copy.riskBadge.HIGH_RISK, language) : t(copy.riskBadge[level], language)

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-data border ${badgeClass} ${bodyFontClass(language)} text-sm font-medium`}
    >
      {prefix}: {label}
    </span>
  )
}
