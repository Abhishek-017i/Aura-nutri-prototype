import { useCallback, useEffect, useMemo, useState } from 'react'

import { NutrientHistograms } from '../components/NutrientHistograms.tsx'
import { NutrientRing } from '../components/NutrientRing.tsx'
import { getDashboard, listLogs, patchPhase, HTTPError } from '../lib/api.ts'
import { bodyFontClass, copy, formatCopy, phaseLabels, phaseSubtitles, t } from '../lib/copy.ts'
import { localDateString, formatDateShort } from '../lib/dates.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import type { Dashboard, MealLog, Phase } from '../lib/types.ts'
import { IconX } from '../components/icons.tsx'

interface DashboardProps {
  user: { id: string; name: string; phase?: Phase | null }
  refreshTrigger: number
  onOpenLog: () => void
  onPhaseChange?: (phase: Phase) => void
}

interface DashboardPhaseOption {
  id: Phase
  icon: string
}

const DASHBOARD_PHASE_OPTIONS: DashboardPhaseOption[] = [
  { id: 'menstrual', icon: '🌸' },
  { id: 'follicular', icon: '🌱' },
  { id: 'ovulatory', icon: '✨' },
  { id: 'luteal', icon: '🌙' },
  { id: 'menopause', icon: '🍃' },
  { id: 'pregnancy_lactation', icon: '🍼' },
]

const NUTRIENT_ORDER: ('iron' | 'calcium' | 'vit_d' | 'b12')[] = [
  'iron',
  'calcium',
  'vit_d',
  'b12',
]

export function Dashboard({ user, refreshTrigger, onOpenLog, onPhaseChange }: DashboardProps) {
  const { language } = useLanguage()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [weeklyLogs, setWeeklyLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null)
  const [phaseUpdating, setPhaseUpdating] = useState(false)
  const [phaseError, setPhaseError] = useState<string | null>(null)
  const [phaseSuccessMessage, setPhaseSuccessMessage] = useState<string | null>(null)

  const handleOpenPhaseModal = () => {
    setSelectedPhase(dashboard?.phase || user.phase || 'menstrual')
    setPhaseError(null)
    setIsPhaseModalOpen(true)
  }

  const handleClosePhaseModal = useCallback(() => {
    if (phaseUpdating) return
    setIsPhaseModalOpen(false)
    setPhaseError(null)
    setSelectedPhase(null)
  }, [phaseUpdating])

  const handleSavePhase = async () => {
    if (!selectedPhase || phaseUpdating) return
    if (selectedPhase === dashboard?.phase) {
      setIsPhaseModalOpen(false)
      return
    }

    setPhaseUpdating(true)
    setPhaseError(null)

    try {
      const result = await patchPhase(user.id, { phase: selectedPhase })
      const newPhase = result.phase
      setDashboard((prev) => (prev ? { ...prev, phase: newPhase } : prev))
      onPhaseChange?.(newPhase)
      setIsPhaseModalOpen(false)

      const label = t(phaseLabels[newPhase], language)
      setPhaseSuccessMessage(formatCopy(copy.dashboard.phaseUpdated, language, { phase: label }))
      setTimeout(() => {
        setPhaseSuccessMessage(null)
      }, 3500)
    } catch (err) {
      setPhaseError(err instanceof HTTPError ? err.message : t(copy.profile.phaseUpdateError, language))
    } finally {
      setPhaseUpdating(false)
    }
  }

  useEffect(() => {
    if (!isPhaseModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !phaseUpdating) {
        handleClosePhaseModal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPhaseModalOpen, phaseUpdating, handleClosePhaseModal])

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
        <div className="bg-rose/10 border border-rose rounded-card p-6 dark:bg-[#593443]/30 dark:border-[#F08B9C]/50 dark:rounded-2xl">
          <h2 className="font-display text-xl font-semibold text-text-main dark:text-[#F5F1F7] mb-2">
            {t(copy.dashboard.errorTitle, language)}
          </h2>
          <p className={`${bodyFontClass(language)} text-text-main dark:text-[#C5BECF] mb-4`}>
            {error ?? t(copy.dashboard.loadFallback, language)}
          </p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white dark:text-[#121216] dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] rounded-data dark:rounded-xl font-sans font-medium transition-colors"
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
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-text-main dark:text-[#F5F1F7] tracking-tight">
            {language === 'hi' ? 'आज का वेलनेस' : "Today's Wellness"}
          </h1>
          <p className={`${bodyFontClass(language)} text-xs sm:text-sm text-text-muted dark:text-[#C5BECF] mt-0.5`}>
            {t(copy.dashboard.greeting, language).replace('{name}', user.name)}
          </p>
        </div>
      </div>

      {hasNoData ? (
        <section className="bg-card border border-border rounded-card p-8 text-center dark:bg-[#202027] dark:border-[#34313D] dark:rounded-2xl transition-colors">
          <h2 className="font-display text-xl font-medium text-text-main dark:text-[#F5F1F7] mb-2">
            {t(copy.dashboard.emptyTitle, language)}
          </h2>
          <p className={`${bodyFontClass(language)} text-text-muted dark:text-[#C5BECF] mb-6 max-w-md mx-auto`}>
            {t(copy.dashboard.emptyBody, language)}
          </p>
          <button
            type="button"
            onClick={onOpenLog}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-[#121216] dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] rounded-data dark:rounded-xl font-sans font-medium transition-colors"
          >
            {t(copy.dashboard.logMeal, language)}
          </button>
        </section>
      ) : (
        <>
          <section data-guide="nutrient-progress" className="bg-card border border-border rounded-card p-6 dark:bg-[#202027] dark:border-[#34313D] dark:rounded-2xl transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-medium text-text-main dark:text-[#F5F1F7]">
                {t(copy.dashboard.progressTitle, language)}
              </h2>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-rose dark:text-[#E9A5D1] dark:bg-[#272731]">
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
                    className="w-full flex justify-center p-3 sm:p-4 rounded-card dark:rounded-2xl dark:bg-[#272731] dark:border dark:border-[#34313D]/60 dark:shadow-sm transition-all"
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

          <section className="bg-card border border-border rounded-card p-6 dark:bg-[#202027] dark:border-[#34313D] dark:rounded-2xl transition-colors">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-soft-accent dark:bg-[#593443]/50 dark:border dark:border-[#A85C91]/40 text-primary dark:text-[#E9A5D1] shadow-sm text-2xl select-none">
                  {dashboard.phase === 'menstrual'
                    ? '🌸'
                    : dashboard.phase === 'follicular'
                    ? '🌱'
                    : dashboard.phase === 'ovulatory'
                    ? '✨'
                    : dashboard.phase === 'luteal'
                    ? '🌙'
                    : dashboard.phase === 'menopause'
                    ? '🍃'
                    : dashboard.phase === 'pregnancy_lactation'
                    ? '🍼'
                    : '🌸'}
                </div>
                <div>
                  <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF] uppercase tracking-wider`}>
                    {t(copy.dashboard.phaseLabel, language)}
                  </p>
                  <p className="font-display text-xl font-medium text-text-main dark:text-[#F5F1F7] capitalize">
                    {dashboard.phase ? t(phaseLabels[dashboard.phase], language) : '-'}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenPhaseModal}
                    className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-primary hover:text-primary-hover dark:text-[#E9A5D1] dark:hover:text-[#CE8BB8] transition-colors focus-visible:outline-2 focus-visible:outline-primary group rounded"
                    aria-haspopup="dialog"
                    aria-expanded={isPhaseModalOpen}
                  >
                    <span>{t(copy.dashboard.changePhase, language)}</span>
                    <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                <div className="px-4 py-2 rounded-xl bg-background dark:bg-[#272731] border border-border dark:border-[#34313D] text-xs font-sans text-text-muted dark:text-[#C5BECF]">
                  <span>{new Date(dashboard.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                {phaseSuccessMessage && (
                  <span className="text-xs font-medium text-emerald dark:text-[#78CBAA] animate-in fade-in duration-200">
                    ✓ {phaseSuccessMessage}
                  </span>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Menstrual Phase Selection Dialog */}
      {isPhaseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm dark:bg-black/75 transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-phase-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !phaseUpdating) {
              handleClosePhaseModal()
            }
          }}
        >
          <div className="w-full max-w-md bg-card border border-border rounded-card p-6 shadow-modal dark:bg-[#202027] dark:border-[#34313D] dark:rounded-2xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3
                  id="change-phase-modal-title"
                  className="font-display text-xl font-semibold text-text-main dark:text-[#F5F1F7]"
                >
                  {t(copy.dashboard.selectPhaseTitle, language)}
                </h3>
                <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF] mt-0.5 leading-relaxed`}>
                  {t(copy.dashboard.selectPhaseSubtitle, language)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClosePhaseModal}
                disabled={phaseUpdating}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main dark:text-[#C5BECF] dark:hover:text-[#F5F1F7] dark:hover:bg-[#272731] disabled:opacity-50 transition-colors"
                aria-label={t(copy.dashboard.close, language)}
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {/* Phase Options List */}
            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-0.5 mb-5" role="radiogroup">
              {DASHBOARD_PHASE_OPTIONS.map((option) => {
                const isSelected = selectedPhase === option.id
                const subtitle = phaseSubtitles[option.id] ? t(phaseSubtitles[option.id], language) : ''

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedPhase(option.id)}
                    className={[
                      'w-full p-3.5 rounded-data dark:rounded-xl border text-left transition-all duration-150 flex items-start gap-3',
                      isSelected
                        ? 'bg-soft-accent border-primary dark:bg-[#EBC6E7] dark:border-[#E4C5E4] dark:shadow-md'
                        : 'bg-background border-border hover:bg-card dark:bg-[#272731] dark:border-[#34313D] dark:hover:bg-[#302D39]',
                    ].join(' ')}
                  >
                    <span className="text-xl select-none leading-none pt-0.5">{option.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={[
                            'font-display text-sm font-semibold capitalize',
                            isSelected
                              ? 'text-primary dark:text-[#29212F]'
                              : 'text-text-main dark:text-[#F5F1F7]',
                          ].join(' ')}
                        >
                          {t(phaseLabels[option.id], language)}
                        </span>
                        <div
                          className={[
                            'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
                            isSelected
                              ? 'border-primary bg-primary text-white dark:border-[#29212F] dark:bg-[#29212F] dark:text-[#EBC6E7]'
                              : 'border-border dark:border-[#423847]',
                          ].join(' ')}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                        </div>
                      </div>
                      {subtitle && (
                        <p
                          className={[
                            `${bodyFontClass(language)} text-xs mt-0.5 leading-normal`,
                            isSelected
                              ? 'text-text-main dark:text-[#62576A]'
                              : 'text-text-muted dark:text-[#C5BECF]',
                          ].join(' ')}
                        >
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Error Message */}
            {phaseError && (
              <p className={`${bodyFontClass(language)} mb-4 text-xs font-medium text-rose dark:text-[#F08B9C]`}>
                {phaseError}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClosePhaseModal}
                disabled={phaseUpdating}
                className={`${bodyFontClass(language)} flex-1 py-2.5 px-4 bg-background border border-border text-text-main hover:bg-card dark:bg-[#272731] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#302D39] rounded-data dark:rounded-xl font-medium disabled:opacity-50 transition-colors`}
              >
                {t(copy.profile.cancel, language)}
              </button>
              <button
                type="button"
                onClick={handleSavePhase}
                disabled={phaseUpdating || !selectedPhase || selectedPhase === dashboard?.phase}
                className={`${bodyFontClass(language)} flex-1 py-2.5 px-4 bg-primary hover:bg-primary-hover text-white dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] dark:text-[#121216] rounded-data dark:rounded-xl font-medium shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2`}
              >
                {phaseUpdating ? (
                  <span>{t(copy.profile.updating, language)}</span>
                ) : (
                  <span>{t(copy.profile.saveChanges, language)}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#A39AAA] text-center`}>
        {dashboard.disclaimer}
      </p>
    </main>
  )
}

function DashboardSkeleton() {
  return (
    <main className="w-full max-w-dashboard mx-auto px-6 py-6 space-y-6 animate-pulse">
      <div className="bg-card border border-border rounded-card p-6 dark:bg-[#202027] dark:border-[#34313D] dark:rounded-2xl">
        <div className="h-6 w-40 bg-primary/10 dark:bg-[#272731] rounded-data mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-36 h-36 rounded-full bg-primary/10 dark:bg-[#272731]" />
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-card p-6 space-y-6 dark:bg-[#202027] dark:border-[#34313D] dark:rounded-2xl">
        <div className="h-6 w-32 bg-primary/10 dark:bg-[#272731] rounded-data" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dark:bg-[#272731] dark:p-4 dark:rounded-2xl">
            <div className="h-4 w-24 bg-primary/10 dark:bg-[#302D39] rounded-data mb-3" />
            <div className="flex items-end gap-3 h-24">
              {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                <div key={j} className="flex-1 h-16 bg-primary/10 dark:bg-[#18181F] rounded-t-data" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

