import { useCallback, useEffect, useMemo, useState } from 'react'

import { bodyFontClass, copy, formatCopy, t } from '../lib/copy.ts'
import { formatDateLong, formatTime, localDateString } from '../lib/dates.ts'
import { getRiskScore, listLogs, HTTPError } from '../lib/api.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import type { Language } from '../lib/language.tsx'
import type { MealLog, NutrientRisk, RiskScore } from '../lib/types.ts'

interface HistoryProps {
  user: { id: string; name: string }
  refreshTrigger: number
}

const PAGE_SIZE = 20

const NUTRIENT_ORDER: ('iron' | 'calcium' | 'vit_d' | 'b12')[] = [
  'iron',
  'calcium',
  'vit_d',
  'b12',
]

const NUTRIENT_COPY_KEYS: Record<(typeof NUTRIENT_ORDER)[number], keyof typeof copy.history> = {
  iron: 'iron',
  calcium: 'calcium',
  vit_d: 'vit_d',
  b12: 'b12',
}

const NUTRIENT_SUGGESTION_KEYS: Record<(typeof NUTRIENT_ORDER)[number], keyof typeof copy.history> = {
  iron: 'suggestionIron',
  calcium: 'suggestionCalcium',
  vit_d: 'suggestionVitD',
  b12: 'suggestionB12',
}

const NUTRIENT_BACKEND_NAME: Record<(typeof NUTRIENT_ORDER)[number], string> = {
  iron: 'Iron',
  calcium: 'Calcium',
  vit_d: 'Vitamin D',
  b12: 'Vitamin B12',
}

function nutrientValue(log: MealLog, key: string): number {
  switch (key) {
    case 'iron':
      return log.iron_mg
    case 'calcium':
      return log.calcium_mg
    case 'vit_d':
      return log.vit_d_iu
    case 'b12':
      return log.b12_mcg
    default:
      return 0
  }
}

export function History({ user, refreshTrigger }: HistoryProps) {
  const { language } = useLanguage()
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null)
  const [logs, setLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const loadLogs = useCallback(
    async (append: boolean, nextOffset: number) => {
      if (!append) setLoading(true)
      setError(null)

      try {
        const fetched = await listLogs({
          userId: user.id,
          limit: PAGE_SIZE,
          offset: nextOffset,
        })

        if (append) {
          setLogs((prev) => [...prev, ...fetched])
        } else {
          setLogs(fetched)
        }
        setHasMore(fetched.length === PAGE_SIZE)
        setOffset(nextOffset + fetched.length)
      } catch (err) {
        if (err instanceof HTTPError) {
          setError(err.message)
        } else {
          setError(t(copy.history.loadError, language))
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [language, user.id],
  )

  const loadAll = useCallback(async () => {
    try {
      const score = await getRiskScore(user.id)
      setRiskScore(score)
      const fetched = await listLogs({ userId: user.id, limit: PAGE_SIZE, offset: 0 })
      setLogs(fetched)
      setHasMore(fetched.length === PAGE_SIZE)
      setOffset(fetched.length)
    } catch (err) {
      if (err instanceof HTTPError) {
        setError(err.message)
      } else {
        setError(t(copy.history.loadError, language))
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [language, user.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll()
  }, [loadAll, refreshTrigger])

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    void loadLogs(true, offset)
  }

  const groupedLogs = useMemo(() => {
    const groups: { date: string; items: MealLog[] }[] = []
    const map = new Map<string, MealLog[]>()
    logs.forEach((log) => {
      const date = localDateString(log.logged_at)
      if (!map.has(date)) map.set(date, [])
      map.get(date)!.push(log)
    })
    map.forEach((items, date) => groups.push({ date, items }))
    groups.sort((a, b) => (a.date < b.date ? 1 : -1))
    return groups
  }, [logs])

  const summary = useMemo(() => {
    if (!riskScore) return null
    const worst = riskScore.nutrients
      .filter((n) => n.risk_level !== 'LOW')
      .sort((a, b) => {
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 }
        return order[a.risk_level] - order[b.risk_level]
      })[0]
    return { worst, daysLogged: riskScore.days_logged }
  }, [riskScore])

  if (loading) {
    return <HistorySkeleton />
  }

  if (error) {
    return (
      <main className="min-h-[60vh] w-full max-w-dashboard mx-auto px-6 py-8">
        <div className="bg-rose/10 border border-rose rounded-card p-6 dark:bg-[#936F79]/50 dark:border-[#E27B76]/50 dark:rounded-2xl">
          <h2 className="font-display text-xl font-semibold text-text-main dark:text-[#F7E4E1] mb-2">
            {t(copy.dashboard.errorTitle, language)}
          </h2>
          <p className={`${bodyFontClass(language)} text-text-main dark:text-[#EBD7D9] mb-4`}>{error}</p>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white dark:text-[#20212A] dark:bg-[#EAC8C8] dark:hover:bg-[#F7E4E1] rounded-data dark:rounded-xl font-sans font-medium transition-colors"
          >
            {t(copy.history.retry, language)}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="w-full max-w-dashboard mx-auto px-6 py-6 space-y-6">
      <section data-guide="history-trends" className="bg-card border border-border rounded-card p-6 dark:bg-[#876671] dark:border-[#A77D87]/40 dark:rounded-2xl transition-colors">
        <h2 className="font-display text-lg font-medium text-text-main dark:text-[#F7E4E1] mb-4">
          {t(copy.history.trendTitle, language)}
        </h2>
        {riskScore ? (
          <>
            <div className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#EBD7D9] mb-4 space-y-1`}>
              <p>
                {formatCopy(copy.history.daysLogged, language, { days: riskScore.days_logged })}
              </p>
              <p>
                {formatCopy(copy.history.overallRisk, language, {
                  risk: t(copy.riskBadge[riskScore.overall_risk], language),
                })}
              </p>
              {summary?.worst && (
                <p>
                  {summary.worst.explanation}
                </p>
              )}
            </div>
            {riskScore.nutrients.length > 0 && (
              <NutrientSummaryLines nutrients={riskScore.nutrients} language={language} />
            )}
          </>
        ) : (
          <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#EBD7D9]`}>
            {t(copy.history.emptyBody, language)}
          </p>
        )}
      </section>

      <section className="bg-card border border-border rounded-card p-6 dark:bg-[#876671] dark:border-[#A77D87]/40 dark:rounded-2xl transition-colors">
        <h2 className="font-display text-lg font-medium text-text-main dark:text-[#F7E4E1] mb-4">
          {t(copy.history.title, language)}
        </h2>

        {logs.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="font-display text-xl font-medium text-text-main dark:text-[#F7E4E1] mb-2">
              {t(copy.history.emptyTitle, language)}
            </h3>
            <p className={`${bodyFontClass(language)} text-text-muted dark:text-[#EBD7D9] max-w-md mx-auto`}>
              {t(copy.history.emptyBody, language)}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedLogs.map(({ date, items }) => (
              <div key={date}>
                <h3 className="font-display text-base font-medium text-text-main dark:text-[#F7E4E1] mb-3">
                  {formatDateLong(`${date}T00:00:00`, language)}
                </h3>
                <div className="space-y-3">
                  {items.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-background dark:bg-[#936F79] border border-transparent dark:border-[#A77D87]/30 rounded-data dark:rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <p className={`${bodyFontClass(language)} font-medium text-text-main dark:text-[#F7E4E1] truncate`}>
                          {log.food_name ?? t(copy.dashboard.notMatched, language)}
                        </p>
                        <p className="font-sans text-xs text-text-muted dark:text-[#EBD7D9]">
                          {formatTime(log.logged_at, language)} · {Math.round(log.qty_g)}g
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {NUTRIENT_ORDER.map((key) => {
                          const value = nutrientValue(log, key)
                          return (
                            <div key={key} className="text-center min-w-[44px]">
                              <p className="font-sans text-[10px] uppercase text-text-muted dark:text-[#EBD7D9]/80 font-medium">
                                {t(copy.history[NUTRIENT_COPY_KEYS[key]], language)}
                              </p>
                              <p className="font-display text-sm font-medium text-text-main dark:text-[#F7E4E1]">
                                {Math.round(value)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className={`${bodyFontClass(language)} w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white dark:text-[#20212A] dark:bg-[#EAC8C8] dark:hover:bg-[#F7E4E1] rounded-data dark:rounded-xl font-medium disabled:opacity-50 transition-colors`}
              >
                {loadingMore ? t(copy.history.loadingMore, language) : t(copy.history.loadMore, language)}
              </button>
            )}
          </div>
        )}
      </section>

      <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#EBD7D9]/70 text-center`}>
        {riskScore?.disclaimer ??
          'AURA-Nutri provides food intelligence, not medical advice. Always consult a qualified physician or registered dietitian before changing your diet or taking supplements.'}
      </p>
    </main>
  )
}

function statusColor(level: NutrientRisk['risk_level']): string {
  switch (level) {
    case 'LOW':
      return 'var(--emerald)'
    case 'MEDIUM':
      return 'var(--amber)'
    case 'HIGH':
    default:
      return 'var(--rose)'
  }
}

function NutrientSummaryLines({
  nutrients,
  language,
}: {
  nutrients: NutrientRisk[]
  language: Language
}) {
  const byName = new Map(nutrients.map((n) => [n.nutrient, n]))
  return (
    <div className="space-y-3">
      {NUTRIENT_ORDER.map((key) => {
        const nutrient = byName.get(NUTRIENT_BACKEND_NAME[key])
        if (!nutrient) return null
        const color = statusColor(nutrient.risk_level)
        return (
          <div
            key={key}
            className="flex items-start gap-3 p-3.5 bg-background dark:bg-[#936F79] border border-transparent dark:border-[#A77D87]/30 rounded-data dark:rounded-xl transition-colors"
          >
            <div
              className="w-3 h-3 mt-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <div className="flex-1 min-w-0">
              <p className={`${bodyFontClass(language)} text-sm text-text-main dark:text-[#F7E4E1]`}>
                {t(copy.history[NUTRIENT_COPY_KEYS[key]], language)}{' '}
                <span className="font-display font-medium">{Math.round(nutrient.percent)}%</span>
              </p>
              <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#EBD7D9] mt-0.5`}>
                {t(copy.history[NUTRIENT_SUGGESTION_KEYS[key]], language)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function HistorySkeleton() {
  return (
    <main className="w-full max-w-dashboard mx-auto px-6 py-6 space-y-6 animate-pulse">
      <div className="bg-card border border-border rounded-card p-6 dark:bg-[#876671] dark:border-[#A77D87]/40 dark:rounded-2xl">
        <div className="h-6 w-40 bg-primary/10 dark:bg-[#936F79] rounded-data mb-4" />
        <div className="h-4 w-64 bg-primary/10 dark:bg-[#936F79] rounded-data mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-background dark:bg-[#936F79] rounded-data">
              <div className="w-3 h-3 mt-1.5 rounded-full bg-primary/10 dark:bg-[#EAC8C8] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-primary/10 dark:bg-[#A77D87] rounded-data" />
                <div className="h-4 w-full bg-primary/10 dark:bg-[#A77D87] rounded-data" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-card p-6 space-y-4 dark:bg-[#876671] dark:border-[#A77D87]/40 dark:rounded-2xl">
        <div className="h-6 w-32 bg-primary/10 dark:bg-[#936F79] rounded-data mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-primary/10 dark:bg-[#936F79] rounded-data mb-3" />
            <div className="h-16 bg-background dark:bg-[#936F79] rounded-data" />
          </div>
        ))}
      </div>
    </main>
  )
}
