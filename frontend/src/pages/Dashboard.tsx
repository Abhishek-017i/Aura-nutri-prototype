import { useCallback, useEffect, useMemo, useState } from 'react'

import { DailyGoalsTracker } from '../components/DailyGoalsTracker.tsx'
import { NutrientHistograms } from '../components/NutrientHistograms.tsx'
import { getDashboard, listLogs, HTTPError } from '../lib/api.ts'
import { bodyFontClass, copy, nutrientLabels, phaseLabels, t } from '../lib/copy.ts'
import { localDateString, formatDateShort } from '../lib/dates.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import type { Dashboard as DashboardType, MealLog } from '../lib/types.ts'
import {
  IconChevronRight,
  IconLeaf,
  IconUtensils,
  IconChevronDown,
} from '../components/icons.tsx'
import { useDynamicGreeting } from '../lib/userUtils.ts'

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

// Food thumbnail mapping for meal items
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

export function Dashboard({ user, refreshTrigger, onOpenLog }: DashboardProps) {
  const { language } = useLanguage()
  const { fullGreeting } = useDynamicGreeting(user, language)
  const [dashboard, setDashboard] = useState<DashboardType | null>(null)
  const [weeklyLogs, setWeeklyLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

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

  const dailyGoals = useMemo(
    () =>
      weeklyData.map((day) => {
        const percents = NUTRIENT_ORDER.map((n) => {
          const target = targets.get(n) ?? 0
          if (target === 0) return 0
          return Math.min((day.values[n] / target) * 100, 100)
        })
        const average = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : 0
        const complete = percents.every((p) => p >= 100)
        return { date: day.date, label: day.label, percent: average, complete }
      }),
    [weeklyData, targets],
  )

  const todayIso = localDateString(new Date())
  const todaysMeals = useMemo(() => {
    return weeklyLogs.filter((log) => localDateString(log.logged_at) === todayIso)
  }, [weeklyLogs, todayIso])

  // Daily target kcal baseline (standard 1,800 kcal or dynamic)
  const calorieTarget = 1800
  const caloriesConsumed = dashboard ? Math.round(dashboard.total_energy_kcal) : 0
  const caloriePercent = Math.min(Math.round((caloriesConsumed / calorieTarget) * 100), 100)

  // Protein targets
  const proteinTarget = 55
  const proteinConsumed = dashboard ? Math.round(dashboard.total_protein_g) : 0
  const proteinPercent = Math.min(Math.round((proteinConsumed / proteinTarget) * 100), 100)

  // Formatted date string for header
  const todayFormatted = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    })
  }, [language])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error || !dashboard) {
    return (
      <main className="min-h-[60vh] w-full max-w-dashboard mx-auto px-4 sm:px-6 py-8">
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-card text-center">
          <div className="w-12 h-12 rounded-full bg-soft-pink text-primary mx-auto flex items-center justify-center text-xl mb-3">
            ⚠️
          </div>
          <h2 className="font-display text-xl font-bold text-plum mb-2">
            {t(copy.dashboard.errorTitle, language)}
          </h2>
          <p className={`${bodyFontClass(language)} text-muted text-sm mb-6 max-w-md mx-auto`}>
            {error ?? t(copy.dashboard.loadFallback, language)}
          </p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-6 py-2.5 bg-primary text-white rounded-full font-semibold shadow-fab hover:scale-105 active:scale-95 transition-all text-sm"
          >
            {t(copy.dashboard.retry, language)}
          </button>
        </div>
      </main>
    )
  }

  const ironP = progressMap.get('iron')
  const calciumP = progressMap.get('calcium')
  const vitdP = progressMap.get('vit_d')
  const b12P = progressMap.get('b12')

  return (
    <main className="w-full max-w-dashboard mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Dynamic Time-Based Greeting Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-plum tracking-tight flex items-center gap-2">
            <span>{fullGreeting}</span>
            <span className="text-xl sm:text-2xl">🌸</span>
          </h1>
          <p className={`${bodyFontClass(language)} text-xs sm:text-sm text-muted mt-1 flex items-center gap-1`}>
            <span>Healthy choices today for a stronger tomorrow</span>
            <span className="text-primary font-bold">♡</span>
          </p>
        </div>

        {/* Small Steps Affirmation Card & Cycle Phase with Olive Accent */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <div className="bg-white border border-border rounded-2xl px-3.5 py-1.5 shadow-sm flex items-center gap-2">
            <span className="text-xs">🌿</span>
            <span className="text-[11px] font-semibold text-plum">
              Small steps create big changes
            </span>
          </div>

          {dashboard.phase && (
            <div className="bg-light-olive border border-olive/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-olive animate-pulse" />
              <span className="text-xs font-bold text-olive-deep capitalize">
                {t(phaseLabels[dashboard.phase], language)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Hero Card: Your Daily Nutrition */}
      <section className="bg-white border border-border rounded-3xl p-5 sm:p-7 shadow-card hover:shadow-card-hover transition-all duration-300">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-soft-pink flex items-center justify-center text-primary shadow-sm flex-shrink-0">
              <IconUtensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-plum tracking-tight">
                Your daily nutrition
              </h2>
              <p className="text-xs text-muted">
                Today, {todayFormatted}
              </p>
            </div>
          </div>

          {/* Date Selector Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-xs font-semibold text-dark-text shadow-sm">
            <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Today, {todayFormatted}</span>
            <IconChevronDown className="w-3.5 h-3.5 text-muted ml-0.5" />
          </div>
        </div>

        {/* Card Content: Circular Calorie Gauge (Left) & Nutrition Progress Bars (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Circular Calorie Gauge */}
          <div className="md:col-span-5 flex flex-col items-center justify-center py-2">
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                {/* Background Track */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  className="stroke-[#FCE8F0]"
                  strokeWidth="10"
                  fill="transparent"
                />
                {/* Glowing Progress Arc */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  className="stroke-primary transition-all duration-1000 ease-out"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - Math.min(caloriePercent, 100) / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Inside Gauge Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl text-primary mb-0.5">🔥</span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-plum tracking-tight">
                    {caloriesConsumed.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted font-semibold">/ {calorieTarget.toLocaleString()}</span>
                </div>
                <span className="text-[11px] font-medium text-muted mt-0.5">kcal</span>
                <span className="mt-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-soft-pink text-primary">
                  {caloriePercent}% of goal
                </span>
              </div>
            </div>
          </div>

          {/* Key Nutrition Bars */}
          <div className="md:col-span-7 space-y-3.5">
            {/* Protein Bar */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-background/60 border border-border hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">💪</span>
                  <span className="text-xs sm:text-sm font-bold text-plum">Protein</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-extrabold text-plum">
                    {proteinConsumed} g <span className="text-muted font-normal">/ {proteinTarget} g</span>
                  </span>
                  <span className="text-xs font-bold text-primary">{proteinPercent}%</span>
                </div>
              </div>
              <div className="w-full h-3 bg-soft-pink rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${proteinPercent}%` }}
                />
              </div>
            </div>

            {/* Iron Bar */}
            {ironP && (
              <div className="p-3 sm:p-3.5 rounded-2xl bg-background/60 border border-border hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💧</span>
                    <span className="text-xs sm:text-sm font-bold text-plum">{t(nutrientLabels.iron, language)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-plum">
                      {Math.round(ironP.current)} {ironP.unit} <span className="text-muted font-normal">/ {Math.round(ironP.target)} {ironP.unit}</span>
                    </span>
                    <span className="text-xs font-bold text-primary">{Math.round(ironP.percent)}%</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-soft-pink rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(ironP.percent, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Calcium Bar with Olive Accent */}
            {calciumP && (
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[#FFF9FB] border border-border/80 hover:border-olive/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🦴</span>
                    <span className="text-xs sm:text-sm font-bold text-plum">{t(nutrientLabels.calcium, language)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-plum">
                      {Math.round(calciumP.current)} {calciumP.unit} <span className="text-muted font-normal">/ {Math.round(calciumP.target)} {calciumP.unit}</span>
                    </span>
                    <span className="text-xs font-bold text-olive-deep">{Math.round(calciumP.percent)}%</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-light-olive rounded-full overflow-hidden">
                  <div
                    className="h-full bg-olive rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(calciumP.percent, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Vitamin D / B12 Bar */}
            {vitdP && (
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[#FFF9FB] border border-border/80 hover:border-amber/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">☀️</span>
                    <span className="text-xs sm:text-sm font-bold text-plum">{t(nutrientLabels.vit_d, language)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-plum">
                      {Math.round(vitdP.current)} {vitdP.unit} <span className="text-muted font-normal">/ {Math.round(vitdP.target)} {vitdP.unit}</span>
                    </span>
                    <span className="text-xs font-bold text-amber">{Math.round(vitdP.percent)}%</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-soft-amber rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(vitdP.percent, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section: Your Nutrient Check-in */}
      <section className="bg-white border border-border rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-light-olive flex items-center justify-center text-olive-deep shadow-sm">
              <IconLeaf className="w-4 h-4" />
            </div>
            <h2 className="font-display text-base sm:text-lg font-bold text-plum tracking-tight">
              Your nutrient check-in
            </h2>
          </div>
          <span className="text-xs font-semibold text-primary bg-soft-pink px-3 py-1 rounded-full flex items-center gap-1">
            <span>View all</span>
            <IconChevronRight className="w-3 h-3" />
          </span>
        </div>

        {/* Nutrient Check-in Cards (matching reference layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Iron Card */}
          {ironP && (
            <div className="p-4 rounded-2xl bg-white border border-border shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-soft-pink flex items-center justify-center text-primary text-base flex-shrink-0">
                  💧
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-plum truncate">{t(nutrientLabels.iron, language)}</h3>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    ironP.percent >= 70 ? 'text-olive-deep bg-light-olive border border-olive/20' : 'text-primary-dark bg-soft-pink border border-primary/20'
                  }`}>
                    {ironP.percent >= 70 ? 'On track' : 'Needs attention'}
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-soft-pink rounded-full overflow-hidden mb-2.5">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(ironP.percent, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-muted">
                <span>{Math.round(ironP.current)} / {Math.round(ironP.target)} {ironP.unit}</span>
                <IconChevronRight className="w-3.5 h-3.5 text-muted" />
              </div>
            </div>
          )}

          {/* Calcium Card */}
          {calciumP && (
            <div className="p-4 rounded-2xl bg-white border border-border shadow-sm hover:border-olive/40 hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-light-olive flex items-center justify-center text-olive-deep text-base flex-shrink-0">
                  🦴
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-plum truncate">{t(nutrientLabels.calcium, language)}</h3>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    calciumP.percent >= 70 ? 'text-olive-deep bg-light-olive border border-olive/20' : 'text-primary-dark bg-soft-pink border border-primary/20'
                  }`}>
                    {calciumP.percent >= 70 ? 'On track' : 'Needs attention'}
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-light-olive rounded-full overflow-hidden mb-2.5">
                <div
                  className="h-full bg-olive rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(calciumP.percent, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-muted">
                <span>{Math.round(calciumP.current)} / {Math.round(calciumP.target)} {calciumP.unit}</span>
                <IconChevronRight className="w-3.5 h-3.5 text-muted" />
              </div>
            </div>
          )}

          {/* Vitamin D Card */}
          {vitdP && (
            <div className="p-4 rounded-2xl bg-white border border-border shadow-sm hover:border-amber/40 hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-soft-amber flex items-center justify-center text-amber text-base flex-shrink-0">
                  ☀️
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-plum truncate">{t(nutrientLabels.vit_d, language)}</h3>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    vitdP.percent >= 70 ? 'text-olive-deep bg-light-olive border border-olive/20' : 'text-amber bg-[#FFF4E5] border border-amber/20'
                  }`}>
                    {vitdP.percent >= 70 ? 'On track' : 'Low'}
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-soft-amber rounded-full overflow-hidden mb-2.5">
                <div
                  className="h-full bg-amber rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(vitdP.percent, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-muted">
                <span>{Math.round(vitdP.current)} / {Math.round(vitdP.target)} {vitdP.unit}</span>
                <IconChevronRight className="w-3.5 h-3.5 text-muted" />
              </div>
            </div>
          )}

          {/* Vitamin B12 Card */}
          {b12P && (
            <div className="p-4 rounded-2xl bg-white border border-border shadow-sm hover:border-purple/40 hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-soft-lavender flex items-center justify-center text-purple text-base flex-shrink-0">
                  ✨
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-plum truncate">{t(nutrientLabels.b12, language)}</h3>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    b12P.percent >= 70 ? 'text-olive-deep bg-light-olive border border-olive/20' : 'text-purple bg-soft-lavender border border-purple/20'
                  }`}>
                    {b12P.percent >= 70 ? 'On track' : 'Needs boost'}
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-soft-lavender rounded-full overflow-hidden mb-2.5">
                <div
                  className="h-full bg-purple rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(b12P.percent, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-muted">
                <span>{Math.round(b12P.current)} / {Math.round(b12P.target)} {b12P.unit}</span>
                <IconChevronRight className="w-3.5 h-3.5 text-muted" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section: Today's Meals */}
      <section className="bg-white border border-border rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-soft-pink flex items-center justify-center text-primary shadow-sm">
              🍲
            </div>
            <h2 className="font-display text-base sm:text-lg font-bold text-plum tracking-tight">
              Today’s meals
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenLog}
            className="text-xs font-semibold text-primary bg-soft-pink px-3 py-1 rounded-full flex items-center gap-1 hover:bg-soft-pink/80 transition-all"
          >
            <span>{todaysMeals.length > 0 ? `${todaysMeals.length} logged` : 'Log meal'}</span>
            <IconChevronRight className="w-3 h-3" />
          </button>
        </div>

        {todaysMeals.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-background border border-dashed border-border">
            <div className="w-12 h-12 rounded-full bg-soft-pink text-primary mx-auto flex items-center justify-center text-xl mb-2">
              🥗
            </div>
            <p className="font-bold text-sm text-plum">No meals logged yet today</p>
            <p className="text-xs text-muted mt-0.5 mb-4">
              Tap the (+) button below or click here to track your food.
            </p>
            <button
              type="button"
              onClick={onOpenLog}
              className="px-5 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs font-semibold shadow-fab hover:scale-105 active:scale-95 transition-all"
            >
              Log your meal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysMeals.map((meal) => {
              const thumb = getMealThumbnail(meal.food_name, meal.meal_type)
              const mealCategory = meal.meal_type || 'Meal'

              return (
                <div
                  key={meal.id}
                  className="flex items-center justify-between p-3 sm:p-3.5 bg-white border border-border rounded-2xl hover:border-primary/40 hover:shadow-sm transition-all duration-200 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Meal Thumbnail */}
                    <img
                      src={thumb}
                      alt={meal.food_name || 'Meal'}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-border flex-shrink-0 shadow-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />

                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-primary capitalize tracking-wide block">
                        {mealCategory}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-plum truncate leading-tight">
                        {meal.food_name || t(copy.dashboard.notMatched, language)}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-muted truncate mt-0.5">
                        {Math.round(meal.qty_g)}g · {Math.round(meal.protein_g)}g protein · {Math.round(meal.iron_mg)}mg iron
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-soft-pink text-primary-dark border border-primary/20">
                      {Math.round(meal.energy_kcal)} kcal
                    </span>
                    <IconChevronRight className="w-4 h-4 text-muted hidden sm:block" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Supportive Wellness Guidance Card with Pastel Pink & Olive Green touches */}
      <section className="bg-gradient-to-r from-soft-pink/60 via-white to-light-olive/60 border border-border rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 flex-1">
          <div className="w-10 h-10 rounded-full bg-light-olive border border-olive/20 flex items-center justify-center text-olive-deep text-lg shadow-sm flex-shrink-0">
            🌿
          </div>
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-olive-deep mb-1">
              A little guidance for you
            </h3>
            <p className={`${bodyFontClass(language)} text-xs sm:text-sm text-plum leading-relaxed`}>
              {dashboard.phase === 'follicular'
                ? 'Add an iron-rich food today — try chana or spinach with lemon for optimal absorption.'
                : dashboard.phase === 'menstrual'
                ? 'Rest and nourish: prioritize warm, iron-rich meals like dal, spinach, and dates with adequate hydration.'
                : dashboard.phase === 'luteal'
                ? 'Keep energy balanced with complex carbs, magnesium, and healthy seeds as your body prepares for the next cycle.'
                : 'Prioritize balanced nutrition with adequate iron, calcium, and vitamin D for sustained energy and vitality.'}
            </p>
          </div>
        </div>

        {/* Fresh food illustration on the right */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-border flex items-center justify-center text-3xl shadow-sm self-center sm:self-auto flex-shrink-0">
          🥗🍋
        </div>
      </section>

      {/* 7-day Daily Goals Tracker */}
      <DailyGoalsTracker days={dailyGoals} />

      {/* 7-day Weekly Trends Histograms */}
      <NutrientHistograms data={weeklyData} targets={targets} />

      {/* Medical Disclaimer */}
      <p className={`${bodyFontClass(language)} text-xs text-muted text-center max-w-xl mx-auto pt-2 pb-4`}>
        {dashboard.disclaimer}
      </p>
    </main>
  )
}

function DashboardSkeleton() {
  return (
    <main className="w-full max-w-dashboard mx-auto px-4 sm:px-6 py-6 space-y-6 animate-pulse">
      <div className="h-10 w-64 bg-soft-pink rounded-full mb-2" />
      <div className="h-4 w-48 bg-soft-pink/60 rounded-full mb-6" />

      <div className="bg-card border border-border rounded-3xl p-6 shadow-card">
        <div className="h-6 w-48 bg-soft-pink rounded-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="w-48 h-48 rounded-full bg-soft-pink/50 mx-auto" />
          <div className="space-y-4">
            <div className="h-14 bg-soft-pink/40 rounded-2xl" />
            <div className="h-14 bg-soft-pink/40 rounded-2xl" />
            <div className="h-14 bg-soft-pink/40 rounded-2xl" />
          </div>
        </div>
      </div>
    </main>
  )
}
