import { useState } from 'react'
import { updateUser, HTTPError } from '../lib/api.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import { bodyFontClass } from '../lib/copy.ts'
import { isEmail } from '../lib/userUtils.ts'
import type { UserProfile } from '../lib/types.ts'

interface NameCompletionModalProps {
  user: UserProfile
  onComplete: (updatedUser: UserProfile) => void
}

export function NameCompletionModal({ user, onComplete }: NameCompletionModalProps) {
  const { language } = useLanguage()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      setError(language === 'hi' ? 'कृपया अपना नाम दर्ज करें।' : 'Please enter your name.')
      return
    }

    if (trimmed.length < 2) {
      setError(
        language === 'hi'
          ? 'नाम कम से कम 2 अक्षरों का होना चाहिए।'
          : 'Name must be at least 2 characters long.',
      )
      return
    }

    if (isEmail(trimmed)) {
      setError(
        language === 'hi'
          ? 'कृपया ईमेल के बजाय अपना असली नाम दर्ज करें।'
          : 'Please enter your actual name rather than an email address.',
      )
      return
    }

    setSaving(true)
    setError(null)

    try {
      const updated = await updateUser(user.id, { name: trimmed })
      onComplete(updated)
    } catch (err) {
      setError(
        err instanceof HTTPError
          ? err.message
          : language === 'hi'
            ? 'नाम सहेजने में विफल। कृपया पुनः प्रयास करें।'
            : 'Failed to save name. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-text/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white border border-border rounded-3xl shadow-modal p-6 sm:p-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Soft decorative ambient glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-soft-pink/70 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-light-olive/80 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-soft-pink border border-border/80 flex items-center justify-center text-primary text-2xl shadow-sm">
              🌸
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-light-olive text-olive-deep border border-olive/20 mb-0.5">
                {language === 'hi' ? 'प्रोफ़ाइल पूर्णता' : 'Profile Completion'}
              </span>
              <p className="text-xs text-muted font-medium">Women Nutri Aura</p>
            </div>
          </div>

          <h2 id="name-modal-title" className="font-display text-2xl font-bold text-plum mb-2">
            {language === 'hi' ? 'हम आपको क्या कहकर बुलाएं?' : 'What should we call you?'}
          </h2>
          <p className={`${bodyFontClass(language)} text-xs sm:text-sm text-muted mb-6 leading-relaxed`}>
            {language === 'hi'
              ? 'आपके पोषण और दैनिक वेलनेस ट्रैकिंग को वैयक्तिकृत करने के लिए अपना नाम बताएं।'
              : "Let's personalize your daily nutrition, wellness guidance, and aura recommendations."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="user-completion-name"
                className={`${bodyFontClass(language)} block text-xs font-bold uppercase tracking-wider text-muted mb-2`}
              >
                {language === 'hi' ? 'आपका नाम' : 'Your name'}
              </label>
              <input
                id="user-completion-name"
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === 'hi' ? 'उदा. प्रिया शर्मा' : 'e.g. Priya'}
                className="w-full px-4 py-3.5 bg-background border border-border rounded-2xl font-sans text-sm text-plum placeholder:text-muted focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                disabled={saving}
              />
              {error && (
                <p className={`${bodyFontClass(language)} mt-2 text-xs text-primary font-bold bg-soft-pink p-3 rounded-2xl border border-primary/20`}>
                  {error}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className={`${bodyFontClass(language)} w-full px-6 py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-sm font-bold shadow-fab hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50`}
              >
                {saving
                  ? language === 'hi'
                    ? 'सहेजा जा रहा है...'
                    : 'Saving...'
                  : language === 'hi'
                    ? 'जारी रखें'
                    : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
