import { useMemo } from 'react'
import type { Language } from '../lib/language.tsx'
import type { MealLog } from '../lib/types.ts'

interface StreakHeatmapProps {
  logs: MealLog[]
  language: Language
}

export function StreakHeatmap({ logs, language }: StreakHeatmapProps) {
  const days = useMemo(() => {
    const map = new Map<string, number>()
    logs.forEach(log => {
      const d = new Date(log.logged_at).toISOString().split('T')[0]
      map.set(d, (map.get(d) || 0) + 1)
    })
    
    const arr = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      arr.push({ date: ds, count: map.get(ds) || 0 })
    }
    return arr
  }, [logs])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5 max-w-[22rem]">
        {days.map((d) => {
          let bgClass = "bg-soft-pink/60 border border-border/80"
          if (d.count > 0) {
            bgClass = "bg-primary"
          }
          const opacity = d.count > 0 ? Math.min(1, 0.45 + d.count * 0.18) : 1

          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.count} meals`}
              className={`w-4 h-4 rounded-md transition-transform hover:scale-110 ${bgClass}`}
              style={{ opacity: d.count > 0 ? opacity : 1 }}
            />
          )
        })}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted font-sans font-medium">
        <span>{language === 'hi' ? 'कम' : 'Less'}</span>
        <div className="w-3.5 h-3.5 rounded-md bg-soft-pink/60 border border-border/80" />
        <div className="w-3.5 h-3.5 rounded-md bg-primary" style={{ opacity: 0.55 }} />
        <div className="w-3.5 h-3.5 rounded-md bg-primary" style={{ opacity: 0.8 }} />
        <div className="w-3.5 h-3.5 rounded-md bg-primary" style={{ opacity: 1 }} />
        <span>{language === 'hi' ? 'ज़्यादा' : 'More'}</span>
      </div>
    </div>
  )
}
