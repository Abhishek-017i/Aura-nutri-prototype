import { useCallback, useState } from 'react'

import { MealPreview } from './MealPreview.tsx'
import { MicButton } from './MicButton.tsx'
import { useLanguage } from '../lib/useLanguage.ts'
import { useVoice } from '../hooks/useVoice.ts'
import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { getDashboard, logMeal, parseMeal, HTTPError } from '../lib/api.ts'
import type { Dashboard, ParsedItem, ParsedMeal, User } from '../lib/types.ts'

interface LogMealModalProps {
  user: User
  open: boolean
  onClose: () => void
  onLogged: () => void
  onShowNutriCard: (dashboard: Dashboard) => void
}

type Stage = 'idle' | 'parsing' | 'logging'
type View = 'input' | 'preview'

export function LogMealModal({
  user,
  open,
  onClose,
  onLogged,
  onShowNutriCard,
}: LogMealModalProps) {
  const { language } = useLanguage()
  const [input, setInput] = useState('')
  const [view, setView] = useState<View>('input')
  const [items, setItems] = useState<ParsedItem[]>([])
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text))
  }, [])
  const voice = useVoice({ onTranscript: handleTranscript, language })

  if (!open) return null

  const isLoading = stage !== 'idle'

  const reset = () => {
    setInput('')
    setView('input')
    setItems([])
    setStage('idle')
    setError(null)
  }

  const handleClose = () => {
    if (isLoading) return
    reset()
    onClose()
  }

  const handleMicClick = () => {
    if (voice.isListening) {
      voice.stop()
    } else {
      voice.reset()
      voice.start()
    }
  }

  const handleParse = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setStage('parsing')
    setError(null)

    try {
      const result: ParsedMeal = await parseMeal(text)
      setItems(result.items)
      setView('preview')
      setStage('idle')
    } catch (err) {
      setStage('idle')
      setError(err instanceof HTTPError ? err.message : t(copy.dashboard.logError, language))
    }
  }

  const handleConfirmLog = async () => {
    if (isLoading || items.length === 0) return

    const matched = items.filter((item) => item.matched)
    if (matched.length === 0) {
      setError(t(copy.dashboard.noMatchError, language))
      return
    }

    setStage('logging')
    setError(null)

    try {
      await logMeal(
        user.id,
        matched.map((item) => ({
          food_id: item.food_id,
          food_name: item.food_name,
          qty_g: item.qty_g,
          energy_kcal: item.energy_kcal,
          protein_g: item.protein_g,
          iron_mg: item.iron_mg,
          calcium_mg: item.calcium_mg,
          vit_d_iu: item.vit_d_iu,
          b12_mcg: item.b12_mcg,
          notes: input.trim(),
        })),
        'voice',
      )

      const dashboard = await getDashboard(user.id)
      reset()
      onLogged()
      onClose()
      onShowNutriCard(dashboard)
    } catch (err) {
      setStage('idle')
      setError(err instanceof HTTPError ? err.message : t(copy.dashboard.logError, language))
    }
  }

  const handleCancelPreview = () => {
    setItems([])
    setView('input')
    setError(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) handleClose()
      }}
    >
      <div className="w-full max-w-chat max-h-[90vh] overflow-y-auto aura-card-surface shadow-2xl p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <h2 className="font-display text-xl font-semibold text-text-main dark:text-[#F5F1F7]">
              {view === 'input'
                ? t(copy.dashboard.voiceTitle, language)
                : t(copy.dashboard.previewTitle, language)}
            </h2>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleClose()
            }}
            disabled={isLoading}
            className="w-9 h-9 rounded-full bg-[#FFFBF8] border border-[#F2DCE3] flex items-center justify-center text-text-muted hover:text-text-main disabled:opacity-50 dark:bg-[#272731] dark:border-[#34313D] dark:text-[#C5BECF] dark:hover:text-[#F5F1F7] dark:hover:bg-[#302D39] shadow-2xs transition-all cursor-pointer"
            aria-label={t(copy.dashboard.close, language)}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {view === 'input' ? (
          <>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <MicButton
                isListening={voice.isListening}
                disabled={!voice.supported || isLoading}
                onClick={handleMicClick}
              />
              <div className="flex-1 w-full">
                <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#C5BECF] mb-3`}>
                  {t(copy.dashboard.voiceHint, language)}
                </p>
                <textarea
                  value={
                    voice.isListening
                      ? `${input} ${voice.interimTranscript}`.trim()
                      : input
                  }
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t(copy.dashboard.placeholder, language)}
                  rows={3}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-[#FFFBF8] border border-[#F2DCE3] rounded-2xl font-sans text-text-main placeholder:text-text-muted/70 focus-visible:outline-primary resize-none disabled:opacity-60 dark:bg-[#18181F] dark:text-[#F5F1F7] dark:border-[#34313D] dark:placeholder-[#A39AAA] dark:focus-visible:outline-[#E9A5D1]"
                />
                {voice.error && (
                  <p className={`${bodyFontClass(language)} mt-2 text-sm text-rose dark:text-[#F08B9C]`}>{voice.error}</p>
                )}
                <p className={`${bodyFontClass(language)} mt-2 text-xs text-text-muted dark:text-[#A39AAA]`}>
                  {t(copy.dashboard.logMealHint, language)}
                </p>
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={isLoading || !input.trim()}
                  className={`${bodyFontClass(language)} mt-4 w-full px-5 py-3 bg-primary hover:bg-primary-hover text-white dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] dark:text-[#121216] rounded-2xl text-base font-medium disabled:opacity-50 transition-all shadow-sm cursor-pointer`}
                >
                  {stage === 'parsing'
                    ? t(copy.dashboard.parsing, language)
                    : t(copy.dashboard.parseMeal, language)}
                </button>
              </div>
            </div>

            {error && (
              <p className={`${bodyFontClass(language)} mt-4 text-sm text-rose dark:text-[#F08B9C]`}>{error}</p>
            )}
          </>
        ) : (
          <MealPreview
            items={items}
            language={language}
            isLoading={isLoading}
            onChange={setItems}
            onConfirm={handleConfirmLog}
            onCancel={handleCancelPreview}
          />
        )}

        {view === 'preview' && error && (
          <p className={`${bodyFontClass(language)} mt-4 text-sm text-rose`}>{error}</p>
        )}
      </div>
    </div>
  )
}
