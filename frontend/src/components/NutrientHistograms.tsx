import { bodyFontClass, copy, nutrientLabels, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'

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
  if (percent >= 100) return '#80864A'
  if (percent >= 50) return '#E88BA8'
  return '#C85D80'
}

export function NutrientHistograms({ data, targets }: NutrientHistogramsProps) {
  const { language } = useLanguage()

  return (
    <section className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-soft-pink flex items-center justify-center text-primary-dark shadow-sm">
            📈
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-dark-text tracking-tight">
            {t(copy.dashboard.weeklyTrendsTitle, language)}
          </h2>
        </div>
        <span className="text-xs font-semibold text-olive-deep bg-light-olive border border-olive/20 px-3 py-1 rounded-full">
          Weekly
        </span>
      </div>

      {data.length === 0 || data.every((d) => Object.values(d.values).every((v) => v === 0)) ? (
        <div className="border border-dashed border-border rounded-2xl p-8 text-center bg-background/50">
          <p className={`${bodyFontClass(language)} text-sm text-muted`}>
            {t(copy.dashboard.weeklyEmpty, language)}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {NUTRIENT_ORDER.map((nutrient) => {
            const target = targets.get(nutrient) ?? 0
            return (
              <div key={nutrient} className="p-4 rounded-2xl bg-background/60 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`${bodyFontClass(language)} text-xs sm:text-sm font-bold text-plum flex items-center gap-1.5`}>
                    <span>{nutrient === 'iron' ? '💧' : nutrient === 'calcium' ? '🦴' : nutrient === 'vit_d' ? '☀️' : '✨'}</span>
                    {t(nutrientLabels[nutrient], language)}
                  </h3>
                  <span className={`${bodyFontClass(language)} text-[11px] font-bold text-primary bg-soft-pink px-2.5 py-0.5 rounded-full`}>
                    Target: {Math.round(target)} {nutrient === 'vit_d' ? 'IU' : nutrient === 'b12' ? 'mcg' : 'mg'}
                  </span>
                </div>
                <div className="flex items-end gap-2 sm:gap-3 h-28 pt-2">
                  {data.map((day) => {
                    const value = day.values[nutrient] ?? 0
                    const percent = target > 0 ? (value / target) * 100 : 0
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                        <div className="w-3/4 sm:w-1/2 flex items-end h-20 bg-soft-pink rounded-t-lg overflow-hidden mx-auto">
                          <div
                            className="w-full rounded-t-lg transition-all duration-500 ease-out"
                            style={{
                              height: `${Math.min(percent, 100)}%`,
                              backgroundColor: statusColor(percent),
                            }}
                            title={`${Math.round(value)} / ${Math.round(target)} (${Math.round(percent)}%)`}
                          />
                        </div>
                        <span className={`${bodyFontClass(language)} text-[10px] font-bold whitespace-nowrap text-muted uppercase tracking-tight`}>
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
