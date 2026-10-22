import { bodyFontClass, copy, nutrientLabels, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import { useTheme } from '../contexts/useTheme.ts'

interface DayValues {
  date: string
  label: string
  values: Record<string, number>
}

interface NutrientHistogramsProps {
  data: DayValues[]
  targets: Map<string, number>
}

const NUTRIENT_ORDER: ('iron' | 'calcium' | 'vit_d' | 'b12')[] = [
  'iron',
  'calcium',
  'vit_d',
  'b12',
]

function statusColor(percent: number): string {
  if (percent >= 100) return 'var(--emerald)'
  if (percent >= 50) return 'var(--amber)'
  return 'var(--rose)'
}

function getHistogramBarColor(percent: number, isDark: boolean): string {
  if (!isDark) return statusColor(percent)
  if (percent >= 100) return '#8FC5B7' // supporting teal
  if (percent >= 50) return '#876671' // dusty rose
  return '#D5A8B4' // secondary nutrition accent
}

export function NutrientHistograms({ data, targets }: NutrientHistogramsProps) {
  const { language } = useLanguage()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section data-guide="seven-day-trends" className="bg-card border border-border rounded-card p-6 dark:bg-[#876671] dark:border-[#A77D87]/40 dark:rounded-2xl transition-colors">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg font-medium text-text-main dark:text-[#F7E4E1]">
          {t(copy.dashboard.weeklyTrendsTitle, language)}
        </h2>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted dark:text-[#F7E4E1] dark:bg-[#936F79]">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        </div>
      </div>

      {data.length === 0 || data.every((d) => Object.values(d.values).every((v) => v === 0)) ? (
        <div className="border border-dashed border-border dark:border-[#A77D87]/40 dark:bg-[#936F79]/30 rounded-data p-6 text-center">
          <p className={`${bodyFontClass(language)} text-text-muted dark:text-[#EBD7D9]`}>
            {t(copy.dashboard.weeklyEmpty, language)}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {NUTRIENT_ORDER.map((nutrient) => {
            const target = targets.get(nutrient) ?? 0
            return (
              <div
                key={nutrient}
                className="dark:bg-[#F7E4E1] dark:p-4 dark:rounded-2xl dark:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`${bodyFontClass(language)} font-medium text-text-main dark:text-[#29212A]`}>
                    {t(nutrientLabels[nutrient], language)}
                  </h3>
                  <span className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#5C4850] font-medium`}>
                    {Math.round(target)} {nutrient === 'vit_d' ? 'IU' : nutrient === 'b12' ? 'mcg' : 'mg'}
                  </span>
                </div>
                <div className="flex items-end gap-3 h-28">
                  {data.map((day) => {
                    const value = day.values[nutrient] ?? 0
                    const percent = target > 0 ? (value / target) * 100 : 0
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <div className="w-1/2 flex items-end h-24 bg-background dark:bg-[#EAC8C8]/50 rounded-t-data dark:rounded-t-lg overflow-hidden mx-auto">
                          <div
                            className="w-full rounded-t-data dark:rounded-t-lg transition-all duration-300"
                            style={{
                              height: `${Math.min(percent, 100)}%`,
                              backgroundColor: getHistogramBarColor(percent, isDark),
                            }}
                            title={`${Math.round(value)} / ${Math.round(target)}`}
                          />
                        </div>
                        <span className={`${bodyFontClass(language)} text-[9px] whitespace-nowrap text-text-muted dark:text-[#5C4850] font-medium uppercase tracking-tighter`}>
                          {day.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
