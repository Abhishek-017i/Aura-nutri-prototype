import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithRedirect,
  GoogleAuthProvider,
} from 'firebase/auth'

import { auth } from '../lib/firebase.ts'
import { completeSignup, patchPhase, HTTPError } from '../lib/api.ts'
import { bodyFontClass } from '../lib/copy.ts'
import { LanguageToggle } from '../lib/language.tsx'
import { useLanguage } from '../lib/useLanguage.ts'
import type { Phase } from '../lib/types.ts'

interface SignupProps {
  onSuccess?: () => void
  onNavigateToLogin?: () => void
}

interface PhaseCardOption {
  id: Phase
  label: string
  subtitle: string
  description: string
}

const PHASE_CARDS: PhaseCardOption[] = [
  {
    id: 'follicular',
    label: 'Follicular Phase',
    subtitle: 'Post-menstruation to ovulation',
    description: 'Higher energy levels, focus on balanced protein and essential vitamins.',
  },
  {
    id: 'menstrual',
    label: 'Menstrual Phase',
    subtitle: 'Active bleeding cycle',
    description: 'Higher iron and restorative nutrient demands to replenish blood loss.',
  },
  {
    id: 'luteal',
    label: 'Luteal Phase',
    subtitle: 'Post-ovulation to pre-period',
    description: 'Increased metabolic rate; magnesium, B6, and calcium supportive nutrition.',
  },
  {
    id: 'menopause',
    label: 'Menopause',
    subtitle: 'Perimenopause and post-menopause',
    description: 'Higher calcium and Vitamin D targets to support bone mineral density.',
  },
  {
    id: 'pregnancy_lactation',
    label: 'Pregnancy & Lactation',
    subtitle: 'Maternal nourishment',
    description: 'Elevated micronutrient demands including iron, folate, calcium, and B12.',
  },
]

function getFriendlyAuthErrorMessage(errorCode: string, defaultMessage: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please log in.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.'
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled.'
    case 'auth/popup-closed-by-user':
      return 'Google sign-up was cancelled before finishing.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.'
    default:
      return defaultMessage || 'Signup failed. Please try again.'
  }
}

export function Signup({ onSuccess, onNavigateToLogin }: SignupProps) {
  const { language } = useLanguage()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Auth
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Step 2: Details
  const [name, setName] = useState('')
  const [age, setAge] = useState<string>('')

  // Step 3: Phase
  const [phase, setPhase] = useState<Phase>('follicular')

  // Status
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigateToLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin()
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#/login'
    }
  }

  const navigateToHome = () => {
    if (onSuccess) {
      onSuccess()
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#/'
    }
  }

  // STEP 1 Handlers
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Email address is required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // If user is already logged in with this email, advance or create
      if (!auth.currentUser || auth.currentUser.email !== trimmedEmail) {
        await createUserWithEmailAndPassword(auth, trimmedEmail, password)
      }
      setStep(2)
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string }
      setError(getFriendlyAuthErrorMessage(authErr?.code ?? '', authErr?.message ?? 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithRedirect(auth, provider)
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string }
      setError(getFriendlyAuthErrorMessage(authErr?.code ?? '', authErr?.message ?? 'Google signup failed'))
      setLoading(false)
    }
  }

  // STEP 2 Handlers
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter your name.')
      return
    }

    const ageNum = parseInt(age, 10)
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setError('Please enter a valid age between 1 and 120.')
      return
    }

    setError(null)
    setStep(3)
  }

  // STEP 3 Handlers (Finalize)
  const handleCompleteSignup = async () => {
    if (!auth.currentUser) {
      setError('Session expired. Please start over from step 1.')
      setStep(1)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const ageNum = parseInt(age, 10) || 28

      // Step 3.1: Call POST /api/users/complete-signup
      await completeSignup({
        name: name.trim(),
        age: ageNum,
        phase,
      })

      // Step 3.2: Call PATCH /api/phase/{uid} to trigger target calculations
      try {
        await patchPhase({ phase })
      } catch (phaseErr) {
        // Even if phase patch fails, user doc was created by complete-signup
        console.warn('Phase patch warning:', phaseErr)
      }

      navigateToHome()
    } catch (err: unknown) {
      if (err instanceof HTTPError) {
        setError(err.message)
      } else {
        const errorObj = err as Error
        setError(errorObj?.message || 'Failed to complete signup. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full max-w-chat mx-auto px-6 py-12 flex flex-col justify-center bg-background">
      <div className="bg-card border border-border rounded-card p-8 shadow-sm">
        {/* Header & Step Indicator */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <span className={`${bodyFontClass(language)} text-xs uppercase tracking-wider text-text-muted font-medium`}>
              Step {step} of 3
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-text-main mt-1">
              {step === 1 && 'Create Account'}
              {step === 2 && 'Personal Details'}
              {step === 3 && 'Select Cycle Phase'}
            </h1>
          </div>
          <LanguageToggle />
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-border h-1.5 rounded-full my-4 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose/10 border border-rose/30 rounded-data">
            <p className={`${bodyFontClass(language)} text-sm text-rose`}>{error}</p>
          </div>
        )}

        {/* STEP 1: AUTH */}
        {step === 1 && (
          <div>
            <p className={`${bodyFontClass(language)} text-sm text-text-muted mb-6`}>
              Start tracking your clinical micronutrients with personalized phase adaptation.
            </p>
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label
                  htmlFor="signup-email"
                  className={`${bodyFontClass(language)} block text-sm font-medium text-text-main mb-1`}
                >
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted focus-visible:outline-text-main"
                  disabled={loading}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className={`${bodyFontClass(language)} block text-sm font-medium text-text-main mb-1`}
                >
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted focus-visible:outline-text-main"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="signup-confirm-password"
                  className={`${bodyFontClass(language)} block text-sm font-medium text-text-main mb-1`}
                >
                  Confirm Password
                </label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted focus-visible:outline-text-main"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className={`${bodyFontClass(language)} w-full mt-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-background rounded-data font-medium disabled:opacity-50 transition-colors`}
              >
                {loading ? 'Creating Account...' : 'Next: Your Details'}
              </button>
            </form>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <span className="relative bg-card px-3 text-xs uppercase tracking-wider text-text-muted font-sans">
                or
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className={`${bodyFontClass(language)} w-full px-6 py-3 bg-background border border-border text-text-main rounded-data font-medium flex items-center justify-center gap-2 hover:bg-soft-accent/40 disabled:opacity-50 transition-colors`}
            >
              Continue with Google
            </button>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={navigateToLogin}
                className={`${bodyFontClass(language)} text-sm text-primary hover:underline font-medium`}
              >
                Already have an account? Log in
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DETAILS */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <p className={`${bodyFontClass(language)} text-sm text-text-muted mb-4`}>
              We use your age to accurately look up ICMR-NIN RDA requirements.
            </p>

            <div>
              <label
                htmlFor="details-name"
                className={`${bodyFontClass(language)} block text-sm font-medium text-text-main mb-1`}
              >
                Your Full Name
              </label>
              <input
                id="details-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ananya Sharma"
                className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted focus-visible:outline-text-main"
                disabled={loading}
                autoFocus
                required
              />
            </div>

            <div>
              <label
                htmlFor="details-age"
                className={`${bodyFontClass(language)} block text-sm font-medium text-text-main mb-1`}
              >
                Age (years)
              </label>
              <input
                id="details-age"
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="28"
                className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted focus-visible:outline-text-main"
                disabled={loading}
                required
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setStep(1)
                }}
                disabled={loading}
                className={`${bodyFontClass(language)} px-4 py-3 bg-background border border-border text-text-main rounded-data font-medium hover:bg-soft-accent/20 transition-colors`}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim() || !age.trim()}
                className={`${bodyFontClass(language)} flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-background rounded-data font-medium disabled:opacity-50 transition-colors`}
              >
                Next: Select Phase
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: PHASE */}
        {step === 3 && (
          <div>
            <p className={`${bodyFontClass(language)} text-sm text-text-muted mb-4`}>
              Choose your current physiological phase to configure dynamic nutrient RDA baselines:
            </p>

            <div className="space-y-3 mb-6 max-h-[360px] overflow-y-auto pr-1">
              {PHASE_CARDS.map((item) => {
                const isSelected = phase === item.id
                return (
                  <div
                    key={item.id}
                    onClick={() => setPhase(item.id)}
                    className={`cursor-pointer p-4 rounded-card border transition-all ${
                      isSelected
                        ? 'border-primary bg-soft-accent/40 ring-1 ring-primary'
                        : 'border-border bg-background hover:border-text-muted/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id={`phase-radio-${item.id}`}
                          name="cycle_phase"
                          value={item.id}
                          checked={isSelected}
                          onChange={() => setPhase(item.id)}
                          className="h-4 w-4 text-primary accent-primary"
                        />
                        <label
                          htmlFor={`phase-radio-${item.id}`}
                          className="font-display font-medium text-text-main cursor-pointer"
                        >
                          {item.label}
                        </label>
                      </div>
                      <span className="text-xs text-text-muted font-sans font-medium">
                        {item.subtitle}
                      </span>
                    </div>
                    <p className={`${bodyFontClass(language)} text-xs text-text-muted mt-2 pl-7`}>
                      {item.description}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setStep(2)
                }}
                disabled={loading}
                className={`${bodyFontClass(language)} px-4 py-3 bg-background border border-border text-text-main rounded-data font-medium hover:bg-soft-accent/20 transition-colors`}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCompleteSignup}
                disabled={loading}
                className={`${bodyFontClass(language)} flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-background rounded-data font-medium disabled:opacity-50 transition-colors`}
              >
                {loading ? 'Completing Setup...' : 'Complete Signup'}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className={`${bodyFontClass(language)} mt-6 text-xs text-text-muted text-center`}>
        AURA-Nutri provides food intelligence, not medical advice. Always consult a
        qualified physician or registered dietitian before changing your diet or taking
        supplements.
      </p>
    </main>
  )
}
