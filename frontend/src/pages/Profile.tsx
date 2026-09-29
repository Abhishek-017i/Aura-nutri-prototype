import { useCallback, useEffect, useState } from 'react'

import { bodyFontClass, copy, phaseLabels, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import {
  claimCheatDay,
  getCheatDayStatus,
  getStreak,
  getUser,
  HTTPError,
  patchPhase,
  updateUser,
} from '../lib/api.ts'
import type { CheatDayStatus, Phase, PhaseOut, StreakOut, UserProfile } from '../lib/types.ts'

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

function formatDateTime(iso: string | null, language: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function Profile({ user, refreshTrigger, onPhaseChange, onSetupComplete }: ProfileProps) {
  const { language } = useLanguage()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [streak, setStreak] = useState<StreakOut | null>(null)
  const [cheat, setCheat] = useState<CheatDayStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phaseUpdating, setPhaseUpdating] = useState(false)
  const [phaseError, setPhaseError] = useState<string | null>(null)
  const [cheatLoading, setCheatLoading] = useState(false)
  const [cheatMessage, setCheatMessage] = useState<string | null>(null)

  // One-time setup state for users who logged in without a phase.
  const [setupName, setSetupName] = useState(user.name)
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
      const [profileData, streakData, cheatData] = await Promise.all([
        getUser(user.id),
        getStreak(user.id),
        getCheatDayStatus(user.id),
      ])
      setProfile(profileData)
      setStreak(streakData)
      setCheat(cheatData)
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
      const streakData = await getStreak(user.id)
      setStreak(streakData)
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
    setEditName(profile.name)
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
      <main className="min-h-[60vh] w-full max-w-dashboard mx-auto px-6 py-8">
        <div className="bg-rose/10 border border-rose rounded-card p-6">
          <h2 className="font-display text-xl font-semibold text-charcoal mb-2">
            {t(copy.dashboard.errorTitle, language)}
          </h2>
          <p className={`${bodyFontClass(language)} text-charcoal mb-4`}>
            {error ?? t(copy.profile.loadError, language)}
          </p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-4 py-2 bg-charcoal text-white rounded-data font-sans font-medium"
          >
            {t(copy.profile.retry, language)}
          </button>
        </div>
      </main>
    )
  }

  if (!profile.phase) {
    return (
      <main className="min-h-[60vh] w-full max-w-dashboard mx-auto px-6 py-8">
        <div className="bg-white border border-line rounded-card p-8">
          <h1 className="font-display text-2xl font-semibold text-charcoal mb-2">
            {t(copy.profile.setupTitle, language)}
          </h1>
          <p className={`${bodyFontClass(language)} text-charcoal-soft mb-6`}>
            {t(copy.profile.setupSubtitle, language)}
          </p>

          <form onSubmit={handleSetupSubmit} className="space-y-6">
            <div>
              <label htmlFor="setup-name" className={`${bodyFontClass(language)} block text-sm font-medium text-charcoal mb-2`}>
                {t(copy.profile.name, language)}
              </label>
              <input
                id="setup-name"
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                className="w-full px-4 py-3 bg-lavender border border-line rounded-data font-sans text-charcoal focus-visible:outline-charcoal"
                disabled={setupSaving}
              />
            </div>

            <div>
              <label htmlFor="setup-age" className={`${bodyFontClass(language)} block text-sm font-medium text-charcoal mb-2`}>
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
                className="w-full px-4 py-3 bg-lavender border border-line rounded-data font-sans text-charcoal placeholder:text-charcoal-soft focus-visible:outline-charcoal"
                disabled={setupSaving}
              />
            </div>

            <div>
              <label htmlFor="setup-phase" className={`${bodyFontClass(language)} block text-sm font-medium text-charcoal mb-2`}>
                {t(copy.profile.phase, language)}
              </label>
              <select
                id="setup-phase"
                value={setupPhase}
                onChange={(e) => setSetupPhase(e.target.value as Phase)}
                className="w-full px-4 py-3 bg-lavender border border-line rounded-data font-sans text-charcoal focus-visible:outline-charcoal"
                disabled={setupSaving}
              >
                {PHASE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(phaseLabels[option], language)}
                  </option>
                ))}
              </select>
              <p className={`${bodyFontClass(language)} mt-2 text-xs text-charcoal-soft`}>
                {t(copy.onboarding.phaseHint, language)}
              </p>
            </div>

            {setupError && (
              <div className="bg-rose/10 border border-rose rounded-data p-3">
                <p className={`${bodyFontClass(language)} text-sm text-rose`}>{setupError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={setupSaving || !setupName.trim()}
              className={`${bodyFontClass(language)} w-full px-6 py-3 bg-charcoal text-white rounded-data font-medium disabled:opacity-50`}
            >
              {setupSaving ? t(copy.profile.updating, language) : t(copy.profile.save, language)}
            </button>
          </form>
        </div>

        <p className={`${bodyFontClass(language)} mt-6 text-xs text-charcoal-soft text-center`}>
          AURA-Nutri provides food intelligence, not medical advice. Always consult a qualified
          physician or registered dietitian before changing your diet or taking supplements.
        </p>
      </main>
    )
  }

  return (
    <main className="w-full max-w-dashboard mx-auto px-6 py-6 space-y-6">
      <section className="bg-white border border-line rounded-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-medium text-charcoal">
            {t(copy.profile.personal, language)}
          </h2>
          {!isEditing && (
            <button
              type="button"
              onClick={() => void handleStartEdit()}
              className={`${bodyFontClass(language)} px-3 py-1.5 bg-lavender border border-line rounded-data text-sm font-medium text-charcoal`}
            >
              {t(copy.profile.edit, language)}
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-username" className={`${bodyFontClass(language)} block text-sm font-medium text-charcoal mb-2`}>
                  {t(copy.profile.username, language)}
                </label>
                <input
                  id="edit-username"
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-lavender border border-line rounded-data font-sans text-charcoal focus-visible:outline-charcoal"
                  disabled={editSaving}
                />
              </div>
              <div>
                <label htmlFor="edit-name" className={`${bodyFontClass(language)} block text-sm font-medium text-charcoal mb-2`}>
                  {t(copy.profile.name, language)}
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-lavender border border-line rounded-data font-sans text-charcoal focus-visible:outline-charcoal"
                  disabled={editSaving}
                />
              </div>
              <div>
                <label htmlFor="edit-age" className={`${bodyFontClass(language)} block text-sm font-medium text-charcoal mb-2`}>
                  {t(copy.profile.age, language)}
                </label>
                <input
                  id="edit-age"
                  type="number"
                  min={0}
                  max={120}
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  className="w-full px-4 py-3 bg-lavender border border-line rounded-data font-sans text-charcoal focus-visible:outline-charcoal"
                  disabled={editSaving}
                />
              </div>
            </div>

            {editError && (
              <div className="bg-rose/10 border border-rose rounded-data p-3">
                <p className={`${bodyFontClass(language)} text-sm text-rose`}>{editError}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={editSaving || !editName.trim() || !editUsername.trim()}
                className={`${bodyFontClass(language)} px-4 py-2 bg-charcoal text-white rounded-data font-medium disabled:opacity-50`}
              >
                {editSaving ? t(copy.profile.updating, language) : t(copy.profile.saveChanges, language)}
              </button>
              <button
                type="button"
                onClick={() => void handleCancelEdit()}
                disabled={editSaving}
                className={`${bodyFontClass(language)} px-4 py-2 bg-lavender border border-line rounded-data font-medium text-charcoal disabled:opacity-50`}
              >
                {t(copy.profile.cancel, language)}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-lavender rounded-data">
              <p className={`${bodyFontClass(language)} text-xs text-charcoal-soft uppercase tracking-wide`}>
                {t(copy.profile.name, language)}
              </p>
              <p className="font-display text-lg font-medium text-charcoal">{profile.name}</p>
            </div>
            <div className="p-3 bg-lavender rounded-data">
              <p className={`${bodyFontClass(language)} text-xs text-charcoal-soft uppercase tracking-wide`}>
                {t(copy.profile.age, language)}
              </p>
              <p className="font-display text-lg font-medium text-charcoal">
                {profile.age ?? t(copy.profile.ageNotSet, language)}
              </p>
            </div>
            <div className="p-3 bg-lavender rounded-data">
              <p className={`${bodyFontClass(language)} text-xs text-charcoal-soft uppercase tracking-wide`}>
                {t(copy.profile.phase, language)}
              </p>
              <p className="font-display text-lg font-medium text-charcoal capitalize">
                {t(phaseLabels[profile.phase], language)}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white border border-line rounded-card p-6">
        <h2 className="font-display text-lg font-medium text-charcoal mb-2">
          {t(copy.profile.phaseAdjust, language)}
        </h2>
        <p className={`${bodyFontClass(language)} text-sm text-charcoal-soft mb-4`}>
          {t(copy.profile.phaseHint, language)}
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => void handlePhaseOffset(-2)}
            disabled={phaseUpdating}
            className="px-3 py-2 bg-lavender border border-line rounded-data text-sm font-medium text-charcoal disabled:opacity-50"
          >
            {t(copy.profile.shiftBack2, language)}
          </button>
          <button
            type="button"
            onClick={() => void handlePhaseOffset(-1)}
            disabled={phaseUpdating}
            className="px-3 py-2 bg-lavender border border-line rounded-data text-sm font-medium text-charcoal disabled:opacity-50"
          >
            {t(copy.profile.shiftBack1, language)}
          </button>
          <div className="px-4 py-2 bg-pink rounded-data text-sm font-medium text-charcoal capitalize">
            {t(phaseLabels[profile.phase], language)}
          </div>
          <button
            type="button"
            onClick={() => void handlePhaseOffset(1)}
            disabled={phaseUpdating}
            className="px-3 py-2 bg-lavender border border-line rounded-data text-sm font-medium text-charcoal disabled:opacity-50"
          >
            {t(copy.profile.shiftForward1, language)}
          </button>
          <button
            type="button"
            onClick={() => void handlePhaseOffset(2)}
            disabled={phaseUpdating}
            className="px-3 py-2 bg-lavender border border-line rounded-data text-sm font-medium text-charcoal disabled:opacity-50"
          >
            {t(copy.profile.shiftForward2, language)}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label htmlFor="phase-select" className={`${bodyFontClass(language)} text-sm font-medium text-charcoal`}>
            {t(copy.profile.setPhase, language)}
          </label>
          <select
            id="phase-select"
            value={profile.phase}
            onChange={(e) => void handleSetPhase(e.target.value as Phase)}
            disabled={phaseUpdating}
            className="px-3 py-2 bg-lavender border border-line rounded-data font-sans text-charcoal disabled:opacity-50"
          >
            {PHASE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(phaseLabels[option], language)}
              </option>
            ))}
          </select>
          {phaseUpdating && (
            <span className={`${bodyFontClass(language)} text-sm text-charcoal-soft`}>
              {t(copy.profile.updating, language)}
            </span>
          )}
        </div>

        {phaseError && (
          <p className={`${bodyFontClass(language)} mt-3 text-sm text-rose`}>{phaseError}</p>
        )}
      </section>

      <section className="bg-white border border-line rounded-card p-6">
        <h2 className="font-display text-lg font-medium text-charcoal mb-4">
          {t(copy.profile.streakTitle, language)}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="p-3 bg-lavender rounded-data">
            <p className={`${bodyFontClass(language)} text-xs text-charcoal-soft uppercase tracking-wide`}>
              {t(copy.profile.currentStreak, language)}
            </p>
            <p className="font-display text-2xl font-medium text-charcoal">
              {streak?.current_streak ?? 0}{' '}
              <span className="text-sm font-sans text-charcoal-soft">
                {t(copy.profile.days, language)}
              </span>
            </p>
          </div>
          <div className="p-3 bg-lavender rounded-data">
            <p className={`${bodyFontClass(language)} text-xs text-charcoal-soft uppercase tracking-wide`}>
              {t(copy.profile.longestStreak, language)}
            </p>
            <p className="font-display text-2xl font-medium text-charcoal">
              {streak?.longest_streak ?? 0}{' '}
              <span className="text-sm font-sans text-charcoal-soft">
                {t(copy.profile.days, language)}
              </span>
            </p>
          </div>
          <div className="p-3 bg-lavender rounded-data">
            <p className={`${bodyFontClass(language)} text-xs text-charcoal-soft uppercase tracking-wide`}>
              {t(copy.profile.cheatCharms, language)}
            </p>
            <p className="font-display text-2xl font-medium text-charcoal">
              {cheat?.cheat_charms_available ?? 0}
            </p>
          </div>
          <div className="p-3 bg-lavender rounded-data">
            <p className={`${bodyFontClass(language)} text-xs text-charcoal-soft uppercase tracking-wide`}>
              {t(copy.profile.nextCharm, language)}
            </p>
            <p className="font-display text-lg font-medium text-charcoal">
              {cheat?.next_charm_available_on
                ? formatDateTime(cheat.next_charm_available_on, language)
                : t(copy.profile.nextCharmUnknown, language)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleUseCheat()}
          disabled={cheatLoading || !cheat?.available}
          className={`${bodyFontClass(language)} px-4 py-2 bg-charcoal text-white rounded-data font-medium disabled:opacity-50`}
        >
          {cheatLoading ? t(copy.profile.updating, language) : t(copy.profile.useCheatDay, language)}
        </button>

        {cheatMessage && (
          <p className={`${bodyFontClass(language)} mt-3 text-sm text-charcoal-soft`}>{cheatMessage}</p>
        )}
      </section>

      <section className="bg-white border border-line rounded-card p-6">
        <h2 className="font-display text-lg font-medium text-charcoal mb-2">
          {t(copy.dashboard.logout, language)}
        </h2>
        <p className={`${bodyFontClass(language)} text-sm text-charcoal-soft`}>
          {t(copy.profile.logoutHint, language)}
        </p>
      </section>

      <p className={`${bodyFontClass(language)} text-xs text-charcoal-soft text-center`}>
        AURA-Nutri provides food intelligence, not medical advice. Always consult a qualified
        physician or registered dietitian before changing your diet or taking supplements.
      </p>
    </main>
  )
}

function ProfileSkeleton() {
  return (
    <main className="w-full max-w-dashboard mx-auto px-6 py-6 space-y-6 animate-pulse">
      <div className="bg-white border border-line rounded-card p-6">
        <div className="h-6 w-40 bg-charcoal/10 rounded-data mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-lavender rounded-data" />
          ))}
        </div>
      </div>

      <div className="bg-white border border-line rounded-card p-6">
        <div className="h-6 w-48 bg-charcoal/10 rounded-data mb-4" />
        <div className="flex flex-wrap gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-16 bg-lavender rounded-data" />
          ))}
        </div>
        <div className="h-10 w-48 bg-lavender rounded-data" />
      </div>

      <div className="bg-white border border-line rounded-card p-6">
        <div className="h-6 w-48 bg-charcoal/10 rounded-data mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-lavender rounded-data" />
          ))}
        </div>
      </div>
    </main>
  )
}
