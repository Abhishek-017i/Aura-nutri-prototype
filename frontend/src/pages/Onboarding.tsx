import { useState } from 'react'
import { createUser, HTTPError } from '../lib/api.ts'
import type { Phase, User } from '../lib/types.ts'

interface OnboardingProps {
  onComplete: (user: User) => void
}

const PHASE_OPTIONS: { value: Phase; label: string }[] = [
  { value: 'follicular', label: 'Follicular' },
  { value: 'menstrual', label: 'Menstruating' },
  { value: 'luteal', label: 'Luteal' },
  { value: 'menopause', label: 'Menopause' },
  { value: 'pregnancy_lactation', label: 'Pregnancy / Lactation' },
]

export function Onboarding({ onComplete }: OnboardingProps) {
  const [name, setName] = useState('')
  const [phase, setPhase] = useState<Phase>('follicular')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const user = await createUser(name.trim(), phase)
      onComplete(user)
    } catch (err) {
      if (err instanceof HTTPError) {
        setError(err.message)
      } else {
        setError('Kuch galat ho gaya. Phir se koshish karein.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full max-w-chat mx-auto px-6 py-12 flex flex-col justify-center">
      <div className="bg-surface border border-line rounded-card p-8">
        <h1 className="font-display text-3xl font-semibold text-ink mb-2">
          AURA-Nutri
        </h1>
        <p className="font-hindi text-lg text-ink-soft mb-8">
          Apna naam aur phase batayein
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block font-sans text-sm font-medium text-ink mb-2">
              Name / Naam
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aapka naam"
              className="w-full px-4 py-3 bg-paper border border-line rounded-data font-sans text-ink placeholder:text-ink-soft focus-visible:outline-iron"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="phase" className="block font-sans text-sm font-medium text-ink mb-2">
              Phase
            </label>
            <select
              id="phase"
              value={phase}
              onChange={(e) => setPhase(e.target.value as Phase)}
              className="w-full px-4 py-3 bg-paper border border-line rounded-data font-sans text-ink focus-visible:outline-iron"
              disabled={loading}
            >
              {PHASE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 font-sans text-xs text-ink-soft">
              Targets adjust automatically based on your phase.
            </p>
          </div>

          {error && (
            <div className="bg-risk-high/10 border border-risk-high rounded-data p-3">
              <p className="font-sans text-sm text-risk-high">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full px-6 py-3 bg-iron text-paper rounded-data font-sans font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>

      <p className="mt-6 font-sans text-xs text-ink-soft text-center">
        AURA-Nutri provides food intelligence, not medical advice. Always consult a
        qualified physician or registered dietitian before changing your diet or taking
        supplements.
      </p>
    </main>
  )
}
