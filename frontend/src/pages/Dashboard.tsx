import { useCallback, useEffect, useMemo, useState } from 'react'

import { NutrientHistograms } from '../components/NutrientHistograms.tsx'
import { NutrientRing } from '../components/NutrientRing.tsx'
import { getDashboard, listLogs, HTTPError } from '../lib/api.ts'
import { bodyFontClass, copy, phaseLabels, t } from '../lib/copy.ts'
import { localDateString, formatDateShort } from '../lib/dates.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import type { Dashboard, MealLog } from '../lib/types.ts'

interface DashboardProps {
  user: { id: string; name: string }
  refreshTrigger: number
  onOpenLog: () => void
}

const NUTRIENT_ORDER: ('iron' | 'calcium' | 'vit_d' | 'b12')[] = [
  'iron',
  'calcium',
  'vit_d',
  'b12',
]

export function Dashboard({ user, refreshTrigger, onOpenLog }: DashboardProps) {
  const { language } = useLanguage()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [weeklyLogs, setWeeklyLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const today = localDateString(new Date())
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 6)
      const weekAgoIso = localDateString(weekAgo)

      const [dash, logs] = await Promise.all([
        getDashboard(user.id),
        listLogs({ userId: user.id, startDate: weekAgoIso, endDate: today }),
      ])
      setDashboard(dash)
      setWeeklyLogs(logs)
    } catch (err) {
      if (err instanceof HTTPError) {
        setError(err.message)
      } else {
        setError(t(copy.dashboard.loadError, language))
      }
    } finally {
      setLoading(false)
    }
  }, [language, user.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()
  }, [loadData, refreshTrigger])

  const progressMap = useMemo(
    () => new Map(dashboard?.progress.map((p) => [p.nutrient, p])),
    [dashboard],
  )

  const targets = useMemo(() => {
    const map = new Map<string, number>()
    dashboard?.progress.forEach((p) => map.set(p.nutrient, p.target))
    return map
  }, [dashboard])

  const weeklyData = useMemo(() => {
    const today = new Date()
    const days: { date: string; label: string; values: Record<string, number> }[] = []

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = localDateString(d)
      days.push({
        date: iso,
        label: formatDateShort(iso, language),
        values: { iron: 0, calcium: 0, vit_d: 0, b12: 0 },
      })
    }

    const totals = new Map<string, Record<string, number>>()
    weeklyLogs.forEach((log) => {
      const date = localDateString(log.logged_at)
      if (!totals.has(date)) {
        totals.set(date, { iron: 0, calcium: 0, vit_d: 0, b12: 0 })
      }
      const day = totals.get(date)!
      day.iron += log.iron_mg
      day.calcium += log.calcium_mg
      day.vit_d += log.vit_d_iu
      day.b12 += log.b12_mcg
    })

    return days.map((day) => ({
      ...day,
      values: totals.get(day.date) ?? day.values,
    }))
  }, [weeklyLogs, language])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error || !dashboard) {
    return (
      <main className="min-h-[60vh] w-full max-w-dashboard mx-auto px-6 py-8">
        <div className="bg-rose/10 border border-rose rounded-card p-6">
          <h2 className="font-display text-xl font-semibold text-text-main mb-2">
            {t(copy.dashboard.errorTitle, language)}
          </h2>
          <p className={`${bodyFontClass(language)} text-text-main mb-4`}>
            {error ?? t(copy.dashboard.loadFallback, language)}
          </p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white dark:text-background rounded-data font-sans font-medium transition-colors"
          >
            {t(copy.dashboard.retry, language)}
          </button>
        </div>
      </main>
    )
  }

  const hasNoData = dashboard.progress.length === 0

  return (
    <main className="w-full max-w-dashboard mx-auto px-6 py-6 space-y-6">
      {hasNoData ? (
        <section className="bg-card border border-border rounded-card p-8 text-center">
          <h2 className="font-display text-xl font-medium text-text-main mb-2">
            {t(copy.dashboard.emptyTitle, language)}
          </h2>
          <p className={`${bodyFontClass(language)} text-text-muted mb-6 max-w-md mx-auto`}>
            {t(copy.dashboard.emptyBody, language)}
          </p>
          <button
            type="button"
            onClick={onOpenLog}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-background rounded-data font-sans font-medium transition-colors"
          >
            {t(copy.dashboard.logMeal, language)}
          </button>
        </section>
      ) : (
        <>
          <section className="bg-card border border-border rounded-card p-6">
            <h2 className="font-display text-lg font-medium text-text-main mb-6">
              {t(copy.dashboard.progressTitle, language)}
            </h2>
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
          </section>

          <NutrientHistograms data={weeklyData} targets={targets} />

          <section className="bg-card border border-border rounded-card p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className={`${bodyFontClass(language)} text-xs text-text-muted uppercase tracking-wide`}>
                  {t(copy.dashboard.phaseLabel, language)}
                </p>
                <p className="font-display text-xl font-medium text-text-main capitalize">
                  {dashboard.phase ? t(phaseLabels[dashboard.phase], language) : '-'}
                </p>
              </div>
              <div className="text-right">
                {/* Removed kcal and protein stats */}
              </div>
            </div>
          </section>
        </>
      )}

      <p className={`${bodyFontClass(language)} text-xs text-text-muted text-center`}>
        {dashboard.disclaimer}
      </p>
    </main>
  )
}

function DashboardSkeleton() {
  return (
    <main className="w-full max-w-dashboard mx-auto px-6 py-6 space-y-6 animate-pulse">
      <div className="bg-card border border-border rounded-card p-6">
        <div className="h-6 w-40 bg-primary/10 rounded-data mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-36 h-36 rounded-full bg-primary/10" />
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-card p-6 space-y-6">
        <div className="h-6 w-32 bg-primary/10 rounded-data" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-primary/10 rounded-data mb-3" />
            <div className="flex items-end gap-3 h-24">
              {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                <div key={j} className="flex-1 h-16 bg-primary/10 rounded-t-data" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

