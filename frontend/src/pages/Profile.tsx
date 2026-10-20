import { useCallback, useEffect, useState } from 'react'

import { bodyFontClass, copy, phaseLabels, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import {
  claimCheatDay,
  getCheatDayStatus,
  getUser,
  HTTPError,
  patchPhase,
  updateUser,
  listLogs,
} from '../lib/api.ts'
import type { CheatDayStatus, Phase, PhaseOut, UserProfile, MealLog } from '../lib/types.ts'
import { StreakHeatmap } from '../components/StreakHeatmap.tsx'
import { getDisplayName, hasValidName } from '../lib/userUtils.ts'

interface ProfileProps {
  user: { id: string; name: string }
  refreshTrigger: number
  onPhaseChange?: (phase: Phase) => void
  onSetupComplete?: (user: UserProfile) => void
}

const PHASE_OPTIONS: Phase[] = [
  'follicular',
  'menstrual',
  'luteal',
  'menopause',
  'pregnancy_lactation',
]

export function Profile({ user, refreshTrigger, onPhaseChange, onSetupComplete }: ProfileProps) {
  const { language } = useLanguage()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [cheat, setCheat] = useState<CheatDayStatus | null>(null)
  const [logs, setLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phaseUpdating, setPhaseUpdating] = useState(false)
  const [phaseError, setPhaseError] = useState<string | null>(null)
  const [cheatLoading, setCheatLoading] = useState(false)
  const [cheatMessage, setCheatMessage] = useState<string | null>(null)

  // One-time setup state for users who logged in without a phase.
  const [setupName, setSetupName] = useState(hasValidName(user) ? user.name : getDisplayName(user))
  const [setupAge, setSetupAge] = useState<string>('')
  const [setupPhase, setSetupPhase] = useState<Phase>('follicular')
  const [setupSaving, setSetupSaving] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)

  // Editable personal details state.
  const [isEditing, setIsEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editName, setEditName] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPhaseError(null)
    setCheatMessage(null)

    try {
      const [profileData, cheatData, logsData] = await Promise.all([
        getUser(user.id),
        getCheatDayStatus(user.id),
        listLogs({ userId: user.id, limit: 300 }),
      ])
      setProfile(profileData)
      setCheat(cheatData)
      setLogs(logsData)
    } catch (err) {
      if (err instanceof HTTPError) {
        setError(err.message)
      } else {
        setError(t(copy.profile.loadError, language))
      }
    } finally {
      setLoading(false)
    }
  }, [language, user.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()
  }, [loadData, refreshTrigger])

  const handlePhaseOffset = async (offset: number) => {
    if (phaseUpdating) return
    setPhaseUpdating(true)
    setPhaseError(null)

    try {
      const result: PhaseOut = await patchPhase(user.id, { offset })
      setProfile((prev) => (prev ? { ...prev, phase: result.phase } : prev))
      onPhaseChange?.(result.phase)
    } catch (err) {
      setPhaseError(err instanceof HTTPError ? err.message : t(copy.profile.phaseUpdateError, language))
    } finally {
      setPhaseUpdating(false)
    }
  }

  const handleSetPhase = async (phase: Phase) => {
    if (phaseUpdating || phase === profile?.phase) return
    setPhaseUpdating(true)
    setPhaseError(null)

    try {
      const result: PhaseOut = await patchPhase(user.id, { phase })
      setProfile((prev) => (prev ? { ...prev, phase: result.phase } : prev))
      onPhaseChange?.(result.phase)
    } catch (err) {
      setPhaseError(err instanceof HTTPError ? err.message : t(copy.profile.phaseUpdateError, language))
    } finally {
      setPhaseUpdating(false)
    }
  }

  const handleUseCheat = async () => {
    if (cheatLoading || !cheat?.available) return
    setCheatLoading(true)
    setCheatMessage(null)

    try {
      const result = await claimCheatDay(user.id)
      setCheat(result)
      setCheatMessage(t(copy.profile.cheatDayUsed, language))
    } catch (err) {
      setCheatMessage(err instanceof HTTPError ? err.message : t(copy.profile.cheatDayUnavailable, language))
    } finally {
      setCheatLoading(false)
    }
  }

  const handleSetupSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!setupName.trim() || !setupPhase) return

    setSetupSaving(true)
    setSetupError(null)

    try {
      const ageNum = setupAge.trim() ? Number(setupAge.trim()) : undefined
      await updateUser(user.id, { name: setupName.trim(), age: ageNum })
      const phaseResult: PhaseOut = await patchPhase(user.id, { phase: setupPhase })
      const updated = await getUser(user.id)
      setProfile(updated)
      onPhaseChange?.(phaseResult.phase)
      onSetupComplete?.(updated)
    } catch (err) {
      setSetupError(
        err instanceof HTTPError ? err.message : t(copy.profile.setupError, language),
      )
    } finally {
      setSetupSaving(false)
    }
  }

  const handleStartEdit = () => {
    if (!profile) return
    setEditUsername(profile.username)
    setEditName(hasValidName(profile) ? profile.name : getDisplayName(profile))
    setEditAge(profile.age?.toString() ?? '')
    setEditError(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditError(null)
  }

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile || !editName.trim() || !editUsername.trim()) return

    setEditSaving(true)
    setEditError(null)

    const payload: Partial<Pick<UserProfile, 'username' | 'name' | 'age'>> = {
      username: editUsername.trim(),
      name: editName.trim(),
    }
    const ageNum = editAge.trim() ? Number(editAge.trim()) : undefined
    if (ageNum !== undefined && !Number.isNaN(ageNum)) {
      payload.age = ageNum
    }

    try {
      const updated = await updateUser(user.id, payload)
      setProfile(updated)
      setIsEditing(false)
    } catch (err) {
      if (err instanceof HTTPError && err.code === 'username_taken') {
        setEditError(t(copy.profile.usernameTaken, language))
      } else {
        setEditError(err instanceof HTTPError ? err.message : t(copy.profile.setupError, language))
      }
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  if (error || !profile) {
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
            {error ?? t(copy.profile.loadError, language)}
          </p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-6 py-2.5 bg-primary text-white rounded-full font-semibold shadow-fab hover:scale-105 active:scale-95 transition-all text-sm"
          >
            {t(copy.profile.retry, language)}
          </button>
        </div>
      </main>
    )
  }

  if (!profile.phase) {
    return (
      <main className="min-h-[60vh] w-full max-w-dashboard mx-auto px-4 sm:px-6 py-8">
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-card">
          <div className="w-12 h-12 rounded-full bg-soft-pink flex items-center justify-center text-primary text-xl mb-4 shadow-sm">
            🌸
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-plum mb-2">
            {t(copy.profile.setupTitle, language)}
          </h1>
          <p className={`${bodyFontClass(language)} text-sm text-muted mb-6`}>
            {t(copy.profile.setupSubtitle, language)}
          </p>

          <form onSubmit={handleSetupSubmit} className="space-y-5 max-w-lg">
            <div>
              <label htmlFor="setup-name" className={`${bodyFontClass(language)} block text-xs font-bold uppercase tracking-wider text-muted mb-2`}>
                {t(copy.profile.name, language)}
              </label>
              <input
                id="setup-name"
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                className="w-full px-4 py-3 bg-background/60 border border-border rounded-2xl font-sans text-sm text-plum focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                disabled={setupSaving}
              />
            </div>

            <div>
              <label htmlFor="setup-age" className={`${bodyFontClass(language)} block text-xs font-bold uppercase tracking-wider text-muted mb-2`}>
                {t(copy.profile.age, language)}
              </label>
              <input
                id="setup-age"
                type="number"
                min={0}
                max={120}
                value={setupAge}
                onChange={(e) => setSetupAge(e.target.value)}
                placeholder="30"
                className="w-full px-4 py-3 bg-background/60 border border-border rounded-2xl font-sans text-sm text-plum placeholder:text-muted focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                disabled={setupSaving}
              />
            </div>

            <div>
              <label htmlFor="setup-phase" className={`${bodyFontClass(language)} block text-xs font-bold uppercase tracking-wider text-muted mb-2`}>
                {t(copy.profile.phase, language)}
              </label>
              <select
                id="setup-phase"
                value={setupPhase}
                onChange={(e) => setSetupPhase(e.target.value as Phase)}
                className="w-full px-4 py-3 bg-background/60 border border-border rounded-2xl font-sans text-sm text-plum focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                disabled={setupSaving}
              >
                {PHASE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(phaseLabels[option], language)}
                  </option>
                ))}
              </select>
              <p className={`${bodyFontClass(language)} mt-2 text-xs text-muted`}>
                {t(copy.onboarding.phaseHint, language)}
              </p>
            </div>

            {setupError && (
              <div className="bg-soft-pink border border-primary/30 rounded-2xl p-3">
                <p className={`${bodyFontClass(language)} text-xs text-primary font-bold`}>{setupError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={setupSaving || !setupName.trim()}
              className={`${bodyFontClass(language)} w-full px-6 py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full font-bold shadow-fab hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 text-sm`}
            >
              {setupSaving ? t(copy.profile.updating, language) : t(copy.profile.save, language)}
            </button>
          </form>
        </div>

        <p className={`${bodyFontClass(language)} mt-6 text-xs text-muted text-center max-w-xl mx-auto`}>
          AURA-Nutri provides food intelligence, not medical advice. Always consult a qualified
          physician or registered dietitian before changing your diet or taking supplements.
        </p>
      </main>
    )
  }

  return (
    <main className="w-full max-w-dashboard mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Personal Details Card */}
      <section className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-soft-pink flex items-center justify-center text-primary text-base shadow-sm">
              👤
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-plum tracking-tight">
              {t(copy.profile.personal, language)}
            </h2>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => void handleStartEdit()}
              className={`${bodyFontClass(language)} px-4 py-1.5 bg-light-olive text-olive-deep hover:bg-olive/20 border border-olive/30 rounded-full text-xs font-bold shadow-sm transition-all`}
            >
              {t(copy.profile.edit, language)}
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-username" className={`${bodyFontClass(language)} block text-xs font-bold text-muted uppercase tracking-wider mb-1.5`}>
                  {t(copy.profile.username, language)}
                </label>
                <input
                  id="edit-username"
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-2xl font-sans text-sm text-plum focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  disabled={editSaving}
                />
              </div>
              <div>
                <label htmlFor="edit-name" className={`${bodyFontClass(language)} block text-xs font-bold text-muted uppercase tracking-wider mb-1.5`}>
                  {t(copy.profile.name, language)}
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-2xl font-sans text-sm text-plum focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  disabled={editSaving}
                />
              </div>
              <div>
                <label htmlFor="edit-age" className={`${bodyFontClass(language)} block text-xs font-bold text-muted uppercase tracking-wider mb-1.5`}>
                  {t(copy.profile.age, language)}
                </label>
                <input
                  id="edit-age"
                  type="number"
                  min={0}
                  max={120}
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-2xl font-sans text-sm text-plum focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  disabled={editSaving}
                />
              </div>
            </div>

            {editError && (
              <div className="bg-soft-pink border border-primary/30 rounded-2xl p-3">
                <p className={`${bodyFontClass(language)} text-xs text-primary font-bold`}>{editError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={editSaving || !editName.trim() || !editUsername.trim()}
                className={`${bodyFontClass(language)} px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs font-bold shadow-fab hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50`}
              >
                {editSaving ? t(copy.profile.updating, language) : t(copy.profile.saveChanges, language)}
              </button>
              <button
                type="button"
                onClick={() => void handleCancelEdit()}
                disabled={editSaving}
                className={`${bodyFontClass(language)} px-5 py-2.5 bg-white border border-border rounded-full text-xs font-bold text-muted hover:text-plum transition-all disabled:opacity-50`}
              >
                {t(copy.profile.cancel, language)}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-background border border-border rounded-2xl hover:border-primary/30 transition-all">
              <p className={`${bodyFontClass(language)} text-[10px] text-muted uppercase font-bold tracking-wider`}>
                {t(copy.profile.name, language)}
              </p>
              <p className="font-display text-base sm:text-lg font-bold text-plum mt-0.5">{getDisplayName(profile)}</p>
              <p className="text-[11px] text-muted">{profile.username.includes('@') ? 'Wellness Member' : `@${profile.username}`}</p>
            </div>
            <div className="p-4 bg-background border border-border rounded-2xl hover:border-primary/30 transition-all">
              <p className={`${bodyFontClass(language)} text-[10px] text-muted uppercase font-bold tracking-wider`}>
                {t(copy.profile.age, language)}
              </p>
              <p className="font-display text-base sm:text-lg font-bold text-plum mt-0.5">
                {profile.age ?? t(copy.profile.ageNotSet, language)}
              </p>
              <p className="text-[11px] text-muted">Years young</p>
            </div>
            <div className="p-4 bg-background border border-border rounded-2xl hover:border-olive/30 transition-all">
              <p className={`${bodyFontClass(language)} text-[10px] text-muted uppercase font-bold tracking-wider`}>
                {t(copy.profile.phase, language)}
              </p>
              <p className="font-display text-base sm:text-lg font-bold text-olive-deep capitalize mt-0.5">
                {t(phaseLabels[profile.phase], language)}
              </p>
              <p className="text-[11px] text-muted">Active biological phase</p>
            </div>
          </div>
        )}
      </section>

      {/* Phase Adjuster Card */}
      <section className="bg-white border border-border rounded-3xl p-5 sm:p-7 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-full bg-light-olive flex items-center justify-center text-olive-deep text-base shadow-sm">
            🌿
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-plum tracking-tight">
            {t(copy.profile.phaseAdjust, language)}
          </h2>
        </div>
        <p className={`${bodyFontClass(language)} text-xs sm:text-sm text-muted mb-5 leading-relaxed`}>
          {t(copy.profile.phaseHint, language)}
        </p>

        {/* Phase Quick Offset Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => void handlePhaseOffset(-2)}
            disabled={phaseUpdating}
            className="px-3.5 py-1.5 bg-light-olive text-olive-deep hover:bg-olive/20 border border-olive/30 rounded-full text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {t(copy.profile.shiftBack2, language)}
          </button>
          <button
            type="button"
            onClick={() => void handlePhaseOffset(-1)}
            disabled={phaseUpdating}
            className="px-3.5 py-1.5 bg-light-olive text-olive-deep hover:bg-olive/20 border border-olive/30 rounded-full text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {t(copy.profile.shiftBack1, language)}
          </button>
          <div className="px-4 py-1.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs font-bold shadow-sm capitalize">
            {t(phaseLabels[profile.phase], language)}
          </div>
          <button
            type="button"
            onClick={() => void handlePhaseOffset(1)}
            disabled={phaseUpdating}
            className="px-3.5 py-1.5 bg-light-olive text-olive-deep hover:bg-olive/20 border border-olive/30 rounded-full text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {t(copy.profile.shiftForward1, language)}
          </button>
          <button
            type="button"
            onClick={() => void handlePhaseOffset(2)}
            disabled={phaseUpdating}
            className="px-3.5 py-1.5 bg-light-olive text-olive-deep hover:bg-olive/20 border border-olive/30 rounded-full text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {t(copy.profile.shiftForward2, language)}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-border">
          <label htmlFor="phase-select" className={`${bodyFontClass(language)} text-xs sm:text-sm font-bold text-plum`}>
            {t(copy.profile.setPhase, language)}:
          </label>
          <select
            id="phase-select"
            value={profile.phase}
            onChange={(e) => void handleSetPhase(e.target.value as Phase)}
            disabled={phaseUpdating}
            className="px-4 py-2 bg-background border border-border rounded-full font-sans text-xs sm:text-sm text-plum focus:bg-white focus:border-primary disabled:opacity-50"
          >
            {PHASE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(phaseLabels[option], language)}
              </option>
            ))}
          </select>
          {phaseUpdating && (
            <span className={`${bodyFontClass(language)} text-xs text-primary font-bold animate-pulse`}>
              {t(copy.profile.updating, language)}
            </span>
          )}
        </div>

        {phaseError && (
          <p className={`${bodyFontClass(language)} mt-3 text-xs sm:text-sm text-primary font-bold bg-soft-pink p-3 rounded-2xl border border-primary/20`}>{phaseError}</p>
        )}
      </section>

      {/* Streak & Consistency Card */}
      <section className="bg-white border border-border rounded-3xl p-5 sm:p-7 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-soft-pink flex items-center justify-center text-primary text-base shadow-sm">
              🔥
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-plum tracking-tight">
              {t(copy.profile.streakTitle, language)}
            </h2>
          </div>
          <span className="text-xs font-semibold text-primary bg-soft-pink px-3 py-1 rounded-full">
            {profile.current_streak} Day Streak
          </span>
        </div>

        <div className="mb-6 p-4 bg-background border border-border rounded-2xl">
          <StreakHeatmap logs={logs} language={language} />
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-plum">Need a reset day?</p>
            <p className="text-xs text-muted">Use a cheat charm without losing your tracking streak.</p>
          </div>
          <button
            type="button"
            onClick={() => void handleUseCheat()}
            disabled={cheatLoading || !cheat?.available}
            className={`${bodyFontClass(language)} px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs font-bold shadow-fab hover:scale-[1.01] transition-all disabled:opacity-50`}
          >
            {cheatLoading ? t(copy.profile.updating, language) : t(copy.profile.useCheatDay, language)}
          </button>
        </div>

        {cheatMessage && (
          <p className={`${bodyFontClass(language)} mt-3 text-xs font-bold text-primary bg-soft-pink p-3 rounded-2xl`}>{cheatMessage}</p>
        )}
      </section>

      <p className={`${bodyFontClass(language)} text-xs text-muted text-center max-w-xl mx-auto pt-2 pb-4`}>
        AURA-Nutri provides food intelligence, not medical advice. Always consult a qualified
        physician or registered dietitian before changing your diet or taking supplements.
      </p>
    </main>
  )
}

function ProfileSkeleton() {
  return (
    <main className="w-full max-w-dashboard mx-auto px-4 sm:px-6 py-6 space-y-6 animate-pulse">
      <div className="bg-white border border-border rounded-3xl p-6 shadow-card">
        <div className="h-6 w-44 bg-soft-pink rounded-full mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-soft-pink/40 rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  )
}
