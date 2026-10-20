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
    setLoading(true)
    setError(null)
    setOffset(0)
    setHasMore(true)
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

function getMealThumbnail(foodName: string | null, mealType: string | null): string {
  const name = (foodName || '').toLowerCase()
  const type = (mealType || '').toLowerCase()

  if (name.includes('poha') || name.includes('oat') || name.includes('egg') || name.includes('toast') || type.includes('breakfast')) {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=160&h=160&q=80'
  }
  if (name.includes('yogurt') || name.includes('fruit') || name.includes('nut') || name.includes('smoothie') || type.includes('snack')) {
    return 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=160&h=160&q=80'
  }
  if (name.includes('dal') || name.includes('roti') || name.includes('rice') || name.includes('sabzi') || name.includes('curry') || type.includes('lunch')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=160&h=160&q=80'
  }
  return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=160&h=160&q=80'
}

  if (loading) {
    return <HistorySkeleton />
  }

  if (error) {
    return (
      <main className="min-h-[60vh] w-full max-w-dashboard mx-auto px-4 sm:px-6 py-8">
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-card text-center">
          <div className="w-12 h-12 rounded-full bg-soft-pink text-primary mx-auto flex items-center justify-center text-xl mb-3">
            ⚠️
          </div>
          <h2 className="font-display text-xl font-bold text-plum mb-2">
            {t(copy.dashboard.errorTitle, language)}
          </h2>
          <p className={`${bodyFontClass(language)} text-muted text-sm mb-6 max-w-md mx-auto`}>{error}</p>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="px-6 py-2.5 bg-primary text-white rounded-full font-semibold shadow-fab hover:scale-105 active:scale-95 transition-all text-sm"
          >
            {t(copy.history.retry, language)}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="w-full max-w-dashboard mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* 14-Day Trend & Risk Section */}
      <section className="bg-white border border-border rounded-3xl p-5 sm:p-7 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-soft-pink flex items-center justify-center text-primary text-base shadow-sm">
              ✨
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-plum tracking-tight">
              {t(copy.history.trendTitle, language)}
            </h2>
          </div>
          {riskScore && (
            <span className="text-xs font-semibold text-primary bg-soft-pink px-3 py-1 rounded-full">
              {formatCopy(copy.history.daysLogged, language, { days: riskScore.days_logged })}
            </span>
          )}
        </div>

        {riskScore ? (
          <>
            <div className={`${bodyFontClass(language)} text-sm text-muted mb-5 space-y-2`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-muted">Overall Nutritional Risk:</span>
                <span
                  className="px-3 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor:
                      riskScore.overall_risk === 'LOW'
                        ? '#F0F0E3'
                        : riskScore.overall_risk === 'MEDIUM'
                        ? '#FFF4E5'
                        : '#F8DDE5',
                    color:
                      riskScore.overall_risk === 'LOW'
                        ? '#626839'
                        : riskScore.overall_risk === 'MEDIUM'
                        ? '#F59E0B'
                        : '#C85D80',
                  }}
                >
                  {t(copy.riskBadge[riskScore.overall_risk], language)}
                </span>
              </div>
              {summary?.worst && (
                <p className="text-xs sm:text-sm text-plum leading-relaxed bg-soft-pink/50 p-3.5 rounded-2xl border border-border">
                  💡 {summary.worst.explanation}
                </p>
              )}
            </div>

            {riskScore.nutrients.length > 0 && (
              <NutrientSummaryLines nutrients={riskScore.nutrients} language={language} />
            )}
          </>
        ) : (
          <p className={`${bodyFontClass(language)} text-sm text-muted`}>
            {t(copy.history.emptyBody, language)}
          </p>
        )}
      </section>

      {/* Logged Meals List Section */}
      <section className="bg-white border border-border rounded-3xl p-5 sm:p-7 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-soft-pink flex items-center justify-center text-primary text-base shadow-sm">
              🍲
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-plum tracking-tight">
              {t(copy.history.title, language)}
            </h2>
          </div>
          <span className="text-xs font-semibold text-primary bg-soft-pink px-3 py-1 rounded-full">
            {logs.length} Meals
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-background border border-dashed border-border">
            <div className="w-14 h-14 rounded-full bg-soft-pink text-primary mx-auto flex items-center justify-center text-2xl mb-3 shadow-sm">
              🥗
            </div>
            <h3 className="font-display text-lg font-bold text-plum mb-1">
              {t(copy.history.emptyTitle, language)}
            </h3>
            <p className={`${bodyFontClass(language)} text-sm text-muted max-w-md mx-auto`}>
              {t(copy.history.emptyBody, language)}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedLogs.map(({ date, items }) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <h3 className="font-display text-sm sm:text-base font-bold text-plum">
                    {formatDateLong(`${date}T00:00:00`, language)}
                  </h3>
                </div>

                <div className="space-y-3">
                  {items.map((log) => {
                    const thumb = getMealThumbnail(log.food_name, log.meal_type)
                    return (
                      <div
                        key={log.id}
                        className="p-3.5 sm:p-4 bg-white border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={thumb}
                            alt={log.food_name || 'Meal'}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-border flex-shrink-0 shadow-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          <div className="min-w-0">
                            <p className={`${bodyFontClass(language)} font-bold text-sm sm:text-base text-plum truncate`}>
                              {log.food_name ?? t(copy.dashboard.notMatched, language)}
                            </p>
                            <p className="font-sans text-xs text-muted">
                              {formatTime(log.logged_at, language)} · {Math.round(log.qty_g)}g
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                          {log.energy_kcal > 0 && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-soft-pink text-primary-dark border border-primary/20">
                              {Math.round(log.energy_kcal)} kcal
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {NUTRIENT_ORDER.map((key) => {
                              const value = nutrientValue(log, key)
                              return (
                                <div
                                  key={key}
                                  className="text-center px-2 py-1 rounded-xl bg-background border border-border min-w-[38px]"
                                >
                                  <p className="font-sans text-[9px] uppercase font-bold text-muted">
                                    {t(copy.history[NUTRIENT_COPY_KEYS[key]], language)}
                                  </p>
                                  <p className="font-display text-xs font-bold text-plum">
                                    {Math.round(value)}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className={`${bodyFontClass(language)} w-full px-6 py-3 bg-light-olive hover:bg-olive/20 text-olive-deep border border-olive/30 rounded-full font-bold transition-all shadow-sm disabled:opacity-50 mt-4 text-sm`}
              >
                {loadingMore ? t(copy.history.loadingMore, language) : t(copy.history.loadMore, language)}
              </button>
            )}
          </div>
        )}
      </section>

      <p className={`${bodyFontClass(language)} text-xs text-muted text-center max-w-xl mx-auto pt-2 pb-4`}>
        {riskScore?.disclaimer ??
          'AURA-Nutri provides food intelligence, not medical advice. Always consult a qualified physician or registered dietitian before changing your diet or taking supplements.'}
      </p>
    </main>
  )
}

function statusColor(level: NutrientRisk['risk_level']): string {
  switch (level) {
    case 'LOW':
      return '#80864A'
    case 'MEDIUM':
      return '#D97706'
    case 'HIGH':
    default:
      return '#C85D80'
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {NUTRIENT_ORDER.map((key) => {
        const nutrient = byName.get(NUTRIENT_BACKEND_NAME[key])
        if (!nutrient) return null
        const color = statusColor(nutrient.risk_level)
        return (
          <div
            key={key}
            className="flex items-start gap-3 p-3.5 bg-background/60 border border-border rounded-2xl hover:border-primary/30 transition-all"
          >
            <div
              className="w-3.5 h-3.5 mt-1 rounded-full flex-shrink-0 shadow-sm"
              style={{ backgroundColor: color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`${bodyFontClass(language)} text-xs sm:text-sm font-bold text-plum`}>
                  {t(copy.history[NUTRIENT_COPY_KEYS[key]], language)}
                </p>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: `${color}1A`,
                    color: color,
                  }}
                >
                  {Math.round(nutrient.percent)}% of target
                </span>
              </div>
              <p className={`${bodyFontClass(language)} text-xs text-muted mt-1 leading-relaxed`}>
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
    <main className="w-full max-w-dashboard mx-auto px-4 sm:px-6 py-6 space-y-6 animate-pulse">
      <div className="bg-card border border-border rounded-3xl p-6 shadow-card">
        <div className="h-6 w-44 bg-soft-pink rounded-full mb-4" />
        <div className="h-4 w-64 bg-soft-pink/60 rounded-full mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-soft-pink/40 rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  )
}


