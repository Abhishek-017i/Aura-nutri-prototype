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
  if (percent >= 100) return '#80864A'
  if (percent >= 50) return '#E88BA8'
  return '#C85D80'
}

export function DailyGoalsTracker({ days }: DailyGoalsTrackerProps) {
  const { language } = useLanguage()
  const radius = 22
  const stroke = 4.5
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI

  return (
    <section className="bg-white border border-border rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-soft-pink flex items-center justify-center text-primary shadow-sm">
            🎯
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-plum tracking-tight">
            {t(copy.dashboard.dailyGoalsTitle, language)}
          </h2>
        </div>
        <span className="text-xs font-semibold text-primary bg-soft-pink px-3 py-1 rounded-full">
          7 Days
        </span>
      </div>

      <div className="flex items-start justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
        {days.map((day) => {
          const clamped = Math.min(day.percent, 100)
          const dash = (clamped / 100) * circumference
          const color = ringColor(day.percent)

          return (
            <div
              key={day.date}
              className={`flex flex-col items-center gap-2 p-2.5 rounded-2xl min-w-[3.75rem] transition-all duration-200 border ${
                day.complete
                  ? 'bg-light-olive border-olive/30 text-olive-deep'
                  : 'bg-white border-border hover:bg-soft-pink/30 hover:border-primary/30'
              }`}
            >
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg
                  width="48"
                  height="48"
                  viewBox={`0 0 ${radius * 2} ${radius * 2}`}
                  className="-rotate-90 transform"
                  aria-hidden="true"
                >
                  <circle
                    cx={radius}
                    cy={radius}
                    r={normalizedRadius}
                    fill="none"
                    stroke="#FCE8F0"
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
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                {day.complete ? (
                  <svg
                    className="absolute inset-0 m-auto w-5 h-5 text-olive"
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
                ) : (
                  <span className="absolute text-[10px] font-extrabold text-plum">
                    {Math.round(day.percent)}%
                  </span>
                )}
              </div>
              <span className={`${bodyFontClass(language)} text-[11px] font-bold text-muted uppercase tracking-wider`}>
                {day.label}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
