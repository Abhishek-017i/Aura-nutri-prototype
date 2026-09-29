import { NutrientRing } from '../components/NutrientRing.tsx'
import { bodyFontClass, copy, nutrientLabels, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import type { Language } from '../lib/language.tsx'
import type { Dashboard, User } from '../lib/types.ts'

interface NutriCardProps {
  user: User
  dashboard: Dashboard
  onClose: () => void
}

const NUTRIENT_ORDER: ('iron' | 'calcium' | 'vit_d' | 'b12')[] = [
  'iron',
  'calcium',
  'vit_d',
  'b12',
]

function riskSummary(progress: Dashboard['progress'], language: Language): string {
  const below = progress
    .filter((p) => p.percent < 100)
    .map((p) => t(nutrientLabels[p.nutrient as keyof typeof nutrientLabels], language).toLowerCase())

  if (below.length === 0) {
    return t({ en: 'All targets met today.', hi: 'आज सभी लक्ष्य पूरे हुए।' }, language)
  }

  if (below.length === 1) {
    return t(
      { en: `${below[0]} is below target today.`, hi: `आज ${below[0]} लक्ष्य से कम है।` },
      language,
    )
  }

  const allButLast = below.slice(0, -1).join(', ')
  const last = below[below.length - 1]
  return t(
    { en: `${allButLast} and ${last} are below target today.`, hi: `आज ${allButLast} और ${last} लक्ष्य से कम हैं।` },
    language,
  )
}

export function NutriCard({ user, dashboard, onClose }: NutriCardProps) {
  const { language } = useLanguage()
  const today = new Date(dashboard.date).toLocaleDateString(
    language === 'hi' ? 'hi-IN' : 'en-IN',
    { day: 'numeric', month: 'long', year: 'numeric' },
  )

  const progressMap = new Map(dashboard.progress.map((p) => [p.nutrient, p]))

  return (
    <div className="fixed inset-0 z-[60] bg-lavender overflow-y-auto">
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-dashboard mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-2xl font-semibold text-charcoal">
              AURA-Nutri
            </h1>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-card bg-white border border-line flex items-center justify-center text-charcoal-soft hover:text-charcoal"
              aria-label={t(copy.dashboard.close, language)}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="bg-white border border-line rounded-card p-6 md:p-8 space-y-6">
            <div className="text-center">
              <p className={`${bodyFontClass(language)} text-sm text-charcoal-soft uppercase tracking-wide`}>
                {today}
              </p>
              <h2 className="font-display text-xl font-medium text-charcoal capitalize mt-1">
                {user.name}
              </h2>
              <p className={`${bodyFontClass(language)} text-sm text-charcoal-soft mt-1 capitalize`}>
                {t({ en: 'Phase', hi: 'अवस्था' }, language)}: {dashboard.phase}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
              {NUTRIENT_ORDER.map((key) => {
                const p = progressMap.get(key)
                if (!p) return null
                return (
                  <NutrientRing
                    key={key}
                    nutrient={key}
                    current={p.current}
                    target={p.target}
                    percent={p.percent}
                    unit={p.unit}
                    size="lg"
                    language={language}
                  />
                )
              })}
            </div>

            <div className="border-t border-line pt-4">
              <p className={`${bodyFontClass(language)} text-center text-charcoal font-medium`}>
                {riskSummary(dashboard.progress, language)}
              </p>
            </div>

            <p className={`${bodyFontClass(language)} text-xs text-charcoal-soft text-center`}>
              {dashboard.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
