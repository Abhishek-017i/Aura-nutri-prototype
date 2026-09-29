import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'

interface DayGoal {
  date: string
  label: string
  percent: number
  complete: boolean
}

interface DailyGoalsTrackerProps {
  days: DayGoal[]
}

function ringColor(percent: number): string {
  if (percent >= 100) return '#5F8A68'
  if (percent >= 50) return '#C8953D'
  return '#C96B67'
}

export function DailyGoalsTracker({ days }: DailyGoalsTrackerProps) {
  const { language } = useLanguage()
  const radius = 20
  const stroke = 4
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI

  return (
    <section className="bg-card border border-border rounded-card p-6">
      <h2 className="font-display text-lg font-medium text-dark-text mb-6">
        {t(copy.dashboard.dailyGoalsTitle, language)}
      </h2>
      <div className="flex items-start justify-between gap-2 overflow-x-auto pb-2">
        {days.map((day) => {
          const clamped = Math.min(day.percent, 100)
          const dash = (clamped / 100) * circumference
          const color = ringColor(day.percent)

          return (
            <div key={day.date} className="flex flex-col items-center gap-2 min-w-[3.5rem]">
              <div className="relative w-12 h-12">
                <svg
                  width="48"
                  height="48"
                  viewBox={`0 0 ${radius * 2} ${radius * 2}`}
                  className="-rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx={radius}
                    cy={radius}
                    r={normalizedRadius}
                    fill="none"
                    stroke="#E9D5FF"
                    strokeWidth={stroke}
                  />
                  <circle
                    cx={radius}
                    cy={radius}
                    r={normalizedRadius}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeLinecap="butt"
                  />
                </svg>
                {day.complete && (
                  <svg
                    className="absolute inset-0 m-auto w-5 h-5 text-emerald"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12l5 5 9-9" />
                  </svg>
                )}
              </div>
              <span className={`${bodyFontClass(language)} text-[10px] text-muted uppercase`}>
                {day.label}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
