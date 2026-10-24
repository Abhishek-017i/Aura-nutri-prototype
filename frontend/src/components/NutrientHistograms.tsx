import { bodyFontClass, copy, nutrientLabels, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import { useTheme } from '../contexts/useTheme.ts'
import { getNutrientColor } from '../lib/nutrientColors.ts'

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

export function NutrientHistograms({ data, targets }: NutrientHistogramsProps) {
  const { language } = useLanguage()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section data-guide="seven-day-trends" className="bg-card border border-border rounded-card p-6 dark:bg-[#202027] dark:border-[#34313D] dark:rounded-2xl transition-colors">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg font-medium text-text-main dark:text-[#F5F1F7]">
          {t(copy.dashboard.weeklyTrendsTitle, language)}
        </h2>
      </div>

      {data.length === 0 || data.every((d) => Object.values(d.values).every((v) => v === 0)) ? (
        <div className="border border-dashed border-border dark:border-[#34313D] dark:bg-[#272731]/30 rounded-data p-6 text-center">
          <p className={`${bodyFontClass(language)} text-text-muted dark:text-[#C5BECF]`}>
            {t(copy.dashboard.weeklyEmpty, language)}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {NUTRIENT_ORDER.map((nutrient) => {
            const target = targets.get(nutrient) ?? 0
            const nutrientColor = getNutrientColor(nutrient, isDark)
            return (
              <div
                key={nutrient}
                className="p-4 rounded-xl bg-background/50 dark:bg-[#272731] border border-[#F3D9E1]/60 dark:border-[#34313D]/60 dark:rounded-2xl transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: nutrientColor }}
                      aria-hidden="true"
                    />
                    <h3 className={`${bodyFontClass(language)} font-medium text-text-main dark:text-[#F5F1F7]`}>
                      {t(nutrientLabels[nutrient], language)}
                    </h3>
                  </div>
                  <span className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF] font-medium`}>
                    {Math.round(target)} {nutrient === 'vit_d' ? 'IU' : nutrient === 'b12' ? 'mcg' : 'mg'}
                  </span>
                </div>
                <div className="flex items-end gap-3 h-28">
                  {data.map((day) => {
                    const value = day.values[nutrient] ?? 0
                    const percent = target > 0 ? (value / target) * 100 : 0
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <div className="w-1/2 flex items-end h-24 bg-background dark:bg-[#18181F] border-b border-[#F0DDE3] dark:border-[#34313D] rounded-t-data dark:rounded-t-lg overflow-hidden mx-auto">
                          <div
                            className="w-full rounded-t-data dark:rounded-t-lg transition-all duration-300"
                            style={{
                              height: `${Math.min(percent, 100)}%`,
                              backgroundColor: nutrientColor,
                            }}
                            title={`${Math.round(value)} / ${Math.round(target)}`}
                          />
                        </div>
                        <span className={`${bodyFontClass(language)} text-[9px] whitespace-nowrap text-text-muted dark:text-[#A39AAA] font-medium uppercase tracking-tighter`}>
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
