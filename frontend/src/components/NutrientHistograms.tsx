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
  if (percent >= 100) return '#10B981'
  if (percent >= 50) return '#F59E0B'
  return '#F43F5E'
}

export function NutrientHistograms({ data, targets }: NutrientHistogramsProps) {
  const { language } = useLanguage()

  return (
    <section className="bg-white border border-line rounded-card p-6">
      <h2 className="font-display text-lg font-medium text-charcoal mb-6">
        {t(copy.dashboard.weeklyTrendsTitle, language)}
      </h2>

      {data.length === 0 || data.every((d) => Object.values(d.values).every((v) => v === 0)) ? (
        <div className="border border-dashed border-line rounded-data p-6 text-center">
          <p className={`${bodyFontClass(language)} text-charcoal-soft`}>
            {t(copy.dashboard.weeklyEmpty, language)}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {NUTRIENT_ORDER.map((nutrient) => {
            const target = targets.get(nutrient) ?? 0
            return (
              <div key={nutrient}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`${bodyFontClass(language)} font-medium text-charcoal`}>
                    {t(nutrientLabels[nutrient], language)}
                  </h3>
                  <span className={`${bodyFontClass(language)} text-xs text-charcoal-soft`}>
                    {Math.round(target)} {nutrient === 'vit_d' ? 'IU' : nutrient === 'b12' ? 'mcg' : 'mg'}
                  </span>
                </div>
                <div className="flex items-end gap-3 h-28">
                  {data.map((day) => {
                    const value = day.values[nutrient] ?? 0
                    const percent = target > 0 ? (value / target) * 100 : 0
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-[2rem]">
                        <div className="w-full flex items-end h-24 bg-lavender rounded-t-data overflow-hidden">
                          <div
                            className="w-full rounded-t-data"
                            style={{
                              height: `${Math.min(percent, 100)}%`,
                              backgroundColor: statusColor(percent),
                            }}
                            title={`${Math.round(value)} / ${Math.round(target)}`}
                          />
                        </div>
                        <span className={`${bodyFontClass(language)} text-[10px] text-charcoal-soft uppercase`}>
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
