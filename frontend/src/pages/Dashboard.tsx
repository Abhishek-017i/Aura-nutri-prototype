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
        <div className="bg-rose/10 border border-rose rounded-card p-6 dark:bg-[#936F79]/50 dark:border-[#E27B76]/50 dark:rounded-2xl">
          <h2 className="font-display text-xl font-semibold text-text-main dark:text-[#F7E4E1] mb-2">
            {t(copy.dashboard.errorTitle, language)}
          </h2>
          <p className={`${bodyFontClass(language)} text-text-main dark:text-[#EBD7D9] mb-4`}>
            {error ?? t(copy.dashboard.loadFallback, language)}
          </p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white dark:text-[#20212A] dark:bg-[#EAC8C8] dark:hover:bg-[#F7E4E1] rounded-data dark:rounded-xl font-sans font-medium transition-colors"
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
      <div className="flex items-center justify-between pt-1" data-guide="dashboard-header">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-text-main dark:text-[#F7E4E1] tracking-tight">
            {language === 'hi' ? 'आज का वेलनेस' : "Today's Wellness"}
          </h1>
          <p className={`${bodyFontClass(language)} text-xs sm:text-sm text-text-muted dark:text-[#EBD7D9] mt-0.5`}>
            {t(copy.dashboard.greeting, language).replace('{name}', user.name)}
          </p>
        </div>
      </div>

      {hasNoData ? (
        <section className="bg-card border border-border rounded-card p-8 text-center dark:bg-[#876671] dark:border-[#A77D87]/40 dark:rounded-2xl transition-colors">
          <h2 className="font-display text-xl font-medium text-text-main dark:text-[#F7E4E1] mb-2">
            {t(copy.dashboard.emptyTitle, language)}
          </h2>
          <p className={`${bodyFontClass(language)} text-text-muted dark:text-[#EBD7D9] mb-6 max-w-md mx-auto`}>
            {t(copy.dashboard.emptyBody, language)}
          </p>
          <button
            type="button"
            onClick={onOpenLog}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-[#20212A] dark:bg-[#EAC8C8] dark:hover:bg-[#F7E4E1] rounded-data dark:rounded-xl font-sans font-medium transition-colors"
          >
            {t(copy.dashboard.logMeal, language)}
          </button>
        </section>
      ) : (
        <>
          <section data-guide="nutrient-progress" className="bg-card border border-border rounded-card p-6 dark:bg-[#876671] dark:border-[#A77D87]/40 dark:rounded-2xl transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-medium text-text-main dark:text-[#F7E4E1]">
                {t(copy.dashboard.progressTitle, language)}
              </h2>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-rose dark:text-[#F7E4E1] dark:bg-[#936F79]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 justify-items-center">
              {NUTRIENT_ORDER.map((key) => {
                const p = progressMap.get(key)
                if (!p) return null
                return (
                  <div
                    key={key}
                    className="w-full flex justify-center p-3 sm:p-4 rounded-card dark:rounded-2xl dark:bg-[#F7E4E1] dark:shadow-sm transition-all"
                  >
                    <NutrientRing
                      nutrient={key}
                      current={p.current}
                      target={p.target}
                      percent={p.percent}
                      unit={p.unit}
                      size="lg"
                      language={language}
                    />
                  </div>
                )
              })}
            </div>
          </section>

          <NutrientHistograms data={weeklyData} targets={targets} />

          <section className="bg-card border border-border rounded-card p-6 dark:bg-[#876671] dark:border-[#A77D87]/40 dark:rounded-2xl transition-colors">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-soft-accent dark:bg-[#F7E4E1] text-primary dark:text-[#29212A] shadow-sm">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                  </svg>
                </div>
                <div>
                  <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#EBD7D9] uppercase tracking-wider`}>
                    {t(copy.dashboard.phaseLabel, language)}
                  </p>
                  <p className="font-display text-xl font-medium text-text-main dark:text-[#F7E4E1] capitalize">
                    {dashboard.phase ? t(phaseLabels[dashboard.phase], language) : '-'}
                  </p>
                </div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-background dark:bg-[#936F79] border border-border dark:border-[#A77D87]/30 text-xs font-sans text-text-muted dark:text-[#F7E4E1]">
                <span>{new Date(dashboard.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          </section>
        </>
      )}

      <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#EBD7D9]/70 text-center`}>
        {dashboard.disclaimer}
      </p>
    </main>
  )
}

function DashboardSkeleton() {
  return (
    <main className="w-full max-w-dashboard mx-auto px-6 py-6 space-y-6 animate-pulse">
      <div className="bg-card border border-border rounded-card p-6 dark:bg-[#876671] dark:border-[#A77D87]/40 dark:rounded-2xl">
        <div className="h-6 w-40 bg-primary/10 dark:bg-[#936F79] rounded-data mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-36 h-36 rounded-full bg-primary/10 dark:bg-[#F7E4E1]/80" />
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-card p-6 space-y-6 dark:bg-[#876671] dark:border-[#A77D87]/40 dark:rounded-2xl">
        <div className="h-6 w-32 bg-primary/10 dark:bg-[#936F79] rounded-data" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dark:bg-[#F7E4E1] dark:p-4 dark:rounded-2xl">
            <div className="h-4 w-24 bg-primary/10 dark:bg-[#936F79] rounded-data mb-3" />
            <div className="flex items-end gap-3 h-24">
              {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                <div key={j} className="flex-1 h-16 bg-primary/10 dark:bg-[#D5A8B4]/70 rounded-t-data" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

