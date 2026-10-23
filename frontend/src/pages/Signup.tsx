import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithRedirect,
  GoogleAuthProvider,
} from 'firebase/auth'

import { auth } from '../lib/firebase.ts'
import { completeSignup, patchPhase, HTTPError } from '../lib/api.ts'
import { bodyFontClass, copy, t, formatCopy } from '../lib/copy.ts'
import { LanguageToggle } from '../lib/language.tsx'
import { useLanguage } from '../lib/useLanguage.ts'
import type { Phase } from '../lib/types.ts'

interface SignupProps {
  onSuccess?: () => void
  onNavigateToLogin?: () => void
}

const PHASE_KEYS: Phase[] = ['follicular', 'menstrual', 'luteal', 'menopause', 'pregnancy_lactation']

type AuthErrorKey = keyof typeof copy.authErrors

function mapSignupAuthErrorCode(errorCode: string): AuthErrorKey {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'emailAlreadyInUse'
    case 'auth/invalid-email':
      return 'invalidEmail'
    case 'auth/weak-password':
      return 'weakPassword'
    case 'auth/operation-not-allowed':
      return 'operationNotAllowed'
    case 'auth/popup-closed-by-user':
      return 'popupClosed'
    case 'auth/network-request-failed':
      return 'networkError'
    default:
      return 'genericSignupError'
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
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null)
  const [rawError, setRawError] = useState<string | null>(null)

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
      setErrorKey('emailRequired')
      setRawError(null)
      return
    }
    if (password.length < 6) {
      setErrorKey('passwordLength')
      setRawError(null)
      return
    }
    if (password !== confirmPassword) {
      setErrorKey('passwordsDoNotMatch')
      setRawError(null)
      return
    }

    setLoading(true)
    setErrorKey(null)
    setRawError(null)

    try {
      if (!auth.currentUser || auth.currentUser.email !== trimmedEmail) {
        await createUserWithEmailAndPassword(auth, trimmedEmail, password)
      }
      setStep(2)
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string }
      if (authErr?.code) {
        setErrorKey(mapSignupAuthErrorCode(authErr.code))
        setRawError(null)
      } else {
        setErrorKey(null)
        setRawError(authErr?.message || null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setErrorKey(null)
    setRawError(null)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithRedirect(auth, provider)
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string }
      if (authErr?.code) {
        setErrorKey(mapSignupAuthErrorCode(authErr.code))
        setRawError(null)
      } else {
        setErrorKey(null)
        setRawError(authErr?.message || null)
      }
      setLoading(false)
    }
  }

  // STEP 2 Handlers
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setErrorKey('nameRequired')
      setRawError(null)
      return
    }

    const ageNum = parseInt(age, 10)
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setErrorKey('invalidAge')
      setRawError(null)
      return
    }

    setErrorKey(null)
    setRawError(null)
    setStep(3)
  }

  // STEP 3 Handlers (Finalize)
  const handleCompleteSignup = async () => {
    if (!auth.currentUser) {
      setErrorKey('sessionExpired')
      setRawError(null)
      setStep(1)
      return
    }

    setLoading(true)
    setErrorKey(null)
    setRawError(null)

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
        console.warn('Phase patch warning:', phaseErr)
      }

      navigateToHome()
    } catch (err: unknown) {
      if (err instanceof HTTPError) {
        setErrorKey(null)
        setRawError(err.message)
      } else {
        setErrorKey('genericCompleteError')
        setRawError(null)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full max-w-chat mx-auto px-6 py-12 flex flex-col justify-center bg-background transition-colors">
      <div className="bg-card border border-border rounded-card p-8 shadow-sm dark:bg-[#202027] dark:border-[#34313D] dark:rounded-2xl">
        {/* Header & Step Indicator */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <span className={`${bodyFontClass(language)} text-xs uppercase tracking-wider text-text-muted dark:text-[#C5BECF] font-medium`}>
              {formatCopy(copy.signup.stepIndicator, language, { step })}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-text-main dark:text-[#F5F1F7] mt-1">
              {step === 1 && t(copy.signup.createAccountTitle, language)}
              {step === 2 && t(copy.signup.personalDetailsTitle, language)}
              {step === 3 && t(copy.signup.selectPhaseTitle, language)}
            </h1>
          </div>
          <LanguageToggle />
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-border dark:bg-[#272731] h-1.5 rounded-full my-4 overflow-hidden">
          <div
            className="bg-primary dark:bg-[#E9A5D1] h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {(errorKey || rawError) && (
          <div className="mb-6 p-3 bg-rose/10 border border-rose/30 rounded-data dark:bg-[#593443]/40 dark:border-[#F08B9C]/50 dark:text-[#F08B9C] dark:rounded-xl">
            <p className={`${bodyFontClass(language)} text-sm text-rose dark:text-[#F08B9C]`}>
              {errorKey ? t(copy.authErrors[errorKey], language) : rawError}
            </p>
          </div>
        )}

        {/* STEP 1: AUTH */}
        {step === 1 && (
          <div>
            <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#C5BECF] mb-6`}>
              {t(copy.signup.step1Subtitle, language)}
            </p>
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label
                  htmlFor="signup-email"
                  className={`${bodyFontClass(language)} block text-sm font-medium text-text-main dark:text-[#F5F1F7] mb-1`}
                >
                  {t(copy.signup.emailLabel, language)}
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t(copy.signup.emailPlaceholder, language)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted dark:bg-[#18181F] dark:border-[#34313D] dark:text-[#F5F1F7] dark:placeholder-[#A39AAA] dark:rounded-xl focus-visible:outline-text-main dark:focus-visible:outline-[#E9A5D1]"
                  disabled={loading}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className={`${bodyFontClass(language)} block text-sm font-medium text-text-main dark:text-[#F5F1F7] mb-1`}
                >
                  {t(copy.signup.passwordLabel, language)}
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t(copy.signup.passwordPlaceholder, language)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted dark:bg-[#18181F] dark:border-[#34313D] dark:text-[#F5F1F7] dark:placeholder-[#A39AAA] dark:rounded-xl focus-visible:outline-text-main dark:focus-visible:outline-[#E9A5D1]"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="signup-confirm-password"
                  className={`${bodyFontClass(language)} block text-sm font-medium text-text-main dark:text-[#F5F1F7] mb-1`}
                >
                  {t(copy.signup.confirmPasswordLabel, language)}
                </label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t(copy.signup.confirmPasswordPlaceholder, language)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted dark:bg-[#18181F] dark:border-[#34313D] dark:text-[#F5F1F7] dark:placeholder-[#A39AAA] dark:rounded-xl focus-visible:outline-text-main dark:focus-visible:outline-[#E9A5D1]"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className={`${bodyFontClass(language)} w-full mt-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-[#121216] dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] rounded-data dark:rounded-xl font-medium disabled:opacity-50 transition-colors`}
              >
                {loading ? t(copy.signup.creatingAccount, language) : t(copy.signup.nextDetails, language)}
              </button>
            </form>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border dark:border-[#34313D]" />
              </div>
              <span className="relative bg-card dark:bg-[#202027] px-3 text-xs uppercase tracking-wider text-text-muted dark:text-[#C5BECF] font-sans">
                {t(copy.signup.orDivider, language)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className={`${bodyFontClass(language)} w-full px-6 py-3 bg-background border border-border text-text-main rounded-data font-medium flex items-center justify-center gap-2 hover:bg-soft-accent/40 dark:bg-[#272731] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#302D39] dark:rounded-xl disabled:opacity-50 transition-colors`}
            >
              {loading ? t(copy.signup.googleSigningIn, language) : t(copy.signup.continueWithGoogle, language)}
            </button>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={navigateToLogin}
                className={`${bodyFontClass(language)} text-sm text-primary dark:text-[#E9A5D1] hover:underline font-medium`}
              >
                {t(copy.signup.alreadyHaveAccount, language)}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DETAILS */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#C5BECF] mb-4`}>
              {t(copy.signup.step2Subtitle, language)}
            </p>

            <div>
              <label
                htmlFor="details-name"
                className={`${bodyFontClass(language)} block text-sm font-medium text-text-main dark:text-[#F5F1F7] mb-1`}
              >
                {t(copy.signup.nameLabel, language)}
              </label>
              <input
                id="details-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(copy.signup.namePlaceholder, language)}
                className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted dark:bg-[#18181F] dark:border-[#34313D] dark:text-[#F5F1F7] dark:placeholder-[#A39AAA] dark:rounded-xl focus-visible:outline-text-main dark:focus-visible:outline-[#E9A5D1]"
                disabled={loading}
                autoFocus
                required
              />
            </div>

            <div>
              <label
                htmlFor="details-age"
                className={`${bodyFontClass(language)} block text-sm font-medium text-text-main dark:text-[#F5F1F7] mb-1`}
              >
                {t(copy.signup.ageLabel, language)}
              </label>
              <input
                id="details-age"
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t(copy.signup.agePlaceholder, language)}
                className="w-full px-4 py-3 bg-background border border-border rounded-data font-sans text-text-main placeholder:text-text-muted dark:bg-[#18181F] dark:border-[#34313D] dark:text-[#F5F1F7] dark:placeholder-[#A39AAA] dark:rounded-xl focus-visible:outline-text-main dark:focus-visible:outline-[#E9A5D1]"
                disabled={loading}
                required
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorKey(null)
                  setRawError(null)
                  setStep(1)
                }}
                disabled={loading}
                className={`${bodyFontClass(language)} px-4 py-3 bg-background border border-border text-text-main rounded-data font-medium hover:bg-soft-accent/20 dark:bg-[#272731] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#302D39] dark:rounded-xl transition-colors`}
              >
                {t(copy.signup.backButton, language)}
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim() || !age.trim()}
                className={`${bodyFontClass(language)} flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-[#121216] dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] rounded-data dark:rounded-xl font-medium disabled:opacity-50 transition-colors`}
              >
                {t(copy.signup.nextPhase, language)}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: PHASE */}
        {step === 3 && (
          <div>
            <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#C5BECF] mb-4`}>
              {t(copy.signup.step3Subtitle, language)}
            </p>

            <div className="space-y-3 mb-6 max-h-[360px] overflow-y-auto pr-1">
              {PHASE_KEYS.map((phaseId) => {
                const isSelected = phase === phaseId
                const optionCopy = copy.signup.phaseOptions[phaseId]
                return (
                  <div
                    key={phaseId}
                    onClick={() => setPhase(phaseId)}
                    className={`cursor-pointer p-4 rounded-card border transition-all ${
                      isSelected
                        ? 'border-primary bg-soft-accent/40 ring-1 ring-primary dark:bg-[#EBC6E7] dark:border-[#E4C5E4] dark:ring-2 dark:ring-[#EBC6E7] dark:rounded-2xl dark:shadow-md'
                        : 'border-border bg-background hover:border-text-muted/60 dark:bg-[#272731] dark:border-[#34313D] dark:rounded-2xl dark:hover:border-[#E9A5D1]/50 dark:hover:bg-[#302D39]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id={`phase-radio-${phaseId}`}
                          name="cycle_phase"
                          value={phaseId}
                          checked={isSelected}
                          onChange={() => setPhase(phaseId)}
                          className="h-4 w-4 text-primary accent-primary"
                        />
                        <label
                          htmlFor={`phase-radio-${phaseId}`}
                          className={`font-display font-medium cursor-pointer ${
                            isSelected
                              ? 'text-text-main dark:text-[#29212F]'
                              : 'text-text-main dark:text-[#F5F1F7]'
                          }`}
                        >
                          {t(optionCopy.label, language)}
                        </label>
                      </div>
                      <span className={`text-xs font-sans font-medium ${
                        isSelected
                          ? 'text-text-muted dark:text-[#62576A]'
                          : 'text-text-muted dark:text-[#C5BECF]'
                      }`}>
                        {t(optionCopy.subtitle, language)}
                      </span>
                    </div>
                    <p className={`${bodyFontClass(language)} text-xs mt-2 pl-7 ${
                      isSelected
                        ? 'text-text-muted dark:text-[#62576A]'
                        : 'text-text-muted dark:text-[#C5BECF]'
                    }`}>
                      {t(optionCopy.description, language)}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorKey(null)
                  setRawError(null)
                  setStep(2)
                }}
                disabled={loading}
                className={`${bodyFontClass(language)} px-4 py-3 bg-background border border-border text-text-main rounded-data font-medium hover:bg-soft-accent/20 dark:bg-[#272731] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#302D39] dark:rounded-xl transition-colors`}
              >
                {t(copy.signup.backButton, language)}
              </button>
              <button
                type="button"
                onClick={handleCompleteSignup}
                disabled={loading}
                className={`${bodyFontClass(language)} flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-[#121216] dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] rounded-data dark:rounded-xl font-medium disabled:opacity-50 transition-colors`}
              >
                {loading ? t(copy.signup.completingSetup, language) : t(copy.signup.completeSignup, language)}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className={`${bodyFontClass(language)} mt-6 text-xs text-text-muted dark:text-[#A39AAA] text-center`}>
        {t(copy.signup.disclaimer, language)}
      </p>
    </main>
  )
}
