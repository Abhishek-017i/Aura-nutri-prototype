import { useCallback, useEffect, useRef, useState } from 'react'

import { useLanguage } from '../lib/useLanguage.ts'
import { bodyFontClass, copy, formatCopy, t } from '../lib/copy.ts'
import type { Tab } from './Layout.tsx'
import {
  IconCamera,
  IconChat,
  IconChevronLeft,
  IconChevronRight,
  IconCompass,
  IconFire,
  IconHelpCircle,
  IconHistory,
  IconHome,
  IconLeaf,
  IconPlus,
  IconProfile,
  IconX,
} from './icons.tsx'

export interface AuraGuideProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onOpenNutriCard?: () => void
  isModalOpen?: boolean
}

type GuideMode = 'closed' | 'welcome' | 'explore' | 'tour' | 'completed'

interface TourStepConfig {
  id: string
  copyKey: keyof typeof copy.guide.steps
  actionKey: keyof typeof copy.guide.actions
  tab: Tab
  targetSelector: string
  icon: typeof IconHome
  action?: 'openNutriCard'
}

const TOUR_STEPS: TourStepConfig[] = [
  {
    id: 'home',
    copyKey: 'home',
    actionKey: 'goToHome',
    tab: 'home',
    targetSelector: '[data-tour="home"]',
    icon: IconHome,
  },
  {
    id: 'addFood',
    copyKey: 'addFood',
    actionKey: 'logMealAction',
    tab: 'home',
    targetSelector: '[data-tour="add-food"]',
    icon: IconPlus,
  },
  {
    id: 'snapFeed',
    copyKey: 'snapFeed',
    actionKey: 'openSnapFeed',
    tab: 'snap',
    targetSelector: '[data-tour="snap-feed"]',
    icon: IconCamera,
  },
  {
    id: 'nutrients',
    copyKey: 'nutrients',
    actionKey: 'viewNutrients',
    tab: 'home',
    targetSelector: '[data-guide="nutrient-progress"]',
    icon: IconLeaf,
  },
  {
    id: 'trends',
    copyKey: 'trends',
    actionKey: 'viewTrends',
    tab: 'home',
    targetSelector: '[data-guide="seven-day-trends"]',
    icon: IconCompass,
  },
  {
    id: 'profile',
    copyKey: 'profile',
    actionKey: 'viewProfile',
    tab: 'profile',
    targetSelector: '[data-tour="profile"]',
    icon: IconProfile,
  },
  {
    id: 'streaks',
    copyKey: 'streaks',
    actionKey: 'viewStreaks',
    tab: 'profile',
    targetSelector: '[data-guide="streak-section"]',
    icon: IconFire,
  },
  {
    id: 'cheatDay',
    copyKey: 'cheatDay',
    actionKey: 'viewCheatDay',
    tab: 'profile',
    targetSelector: '[data-guide="cheat-charm"]',
    icon: IconLeaf,
  },
  {
    id: 'history',
    copyKey: 'history',
    actionKey: 'openHistory',
    tab: 'history',
    targetSelector: '[data-tour="history"]',
    icon: IconHistory,
  },
  {
    id: 'assistant',
    copyKey: 'assistant',
    actionKey: 'openAssistant',
    tab: 'home',
    targetSelector: '[data-tour="ai-assistant"]',
    icon: IconChat,
  },
]

const STORAGE_KEY = 'aura_guide_has_seen'

export function AuraGuide({
  activeTab,
  onTabChange,
  onOpenNutriCard,
  isModalOpen = false,
}: AuraGuideProps) {
  const { language } = useLanguage()
  const [mode, setMode] = useState<GuideMode>('closed')
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const currentStep = TOUR_STEPS[currentStepIndex]

  // Restore focus to trigger when guide closes
  const handleClose = useCallback(() => {
    setMode('closed')
    setSelectedFeatureId(null)
    setTargetRect(null)
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // storage unavailable failsafe
    }
    setTimeout(() => {
      triggerButtonRef.current?.focus()
    }, 50)
  }, [])

  // Position target highlight and scroll
  const updateTargetRect = useCallback((selector: string) => {
    const el = document.querySelector(selector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)
    } else {
      setTargetRect(null)
    }
  }, [])

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    } else {
      setMode('completed')
      setTargetRect(null)
    }
  }, [currentStepIndex])

  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }, [currentStepIndex])

  const handleStartTour = useCallback(() => {
    setCurrentStepIndex(0)
    setMode('tour')
  }, [])

  // When step changes in tour mode, handle tab change and target rect
  useEffect(() => {
    if (mode !== 'tour') {
      return
    }

    const step = TOUR_STEPS[currentStepIndex]
    if (!step) return

    if (activeTab !== step.tab) {
      onTabChange(step.tab)
    }

    // Wait for DOM to render after possible tab switch
    const timer = setTimeout(() => {
      updateTargetRect(step.targetSelector)
    }, 180)

    const handleResize = () => updateTargetRect(step.targetSelector)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
      setTargetRect(null)
    }
  }, [mode, currentStepIndex, activeTab, onTabChange, updateTargetRect])

  // Keyboard navigation
  useEffect(() => {
    if (mode === 'closed') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (mode === 'tour') {
        if (e.key === 'ArrowRight') {
          handleNextStep()
        } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
          handlePrevStep()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, handleClose, handleNextStep, handlePrevStep, currentStepIndex])

  const handleContextualAction = (step: TourStepConfig) => {
    if (step.action === 'openNutriCard' && onOpenNutriCard) {
      onTabChange(step.tab)
      handleClose()
      setTimeout(() => {
        onOpenNutriCard()
      }, 100)
      return
    }

    onTabChange(step.tab)
    handleClose()

    // Pulse target element to highlight
    setTimeout(() => {
      const el = document.querySelector(step.targetSelector)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring-4', 'ring-primary', 'dark:ring-[#E9A5D1]', 'transition-all', 'duration-500')
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-primary', 'dark:ring-[#E9A5D1]', 'transition-all', 'duration-500')
        }, 3000)
      }
    }, 250)
  }

  // Calculate popover positioning near target
  const getPopoverStyle = () => {
    if (!targetRect || typeof window === 'undefined') {
      return {}
    }

    const isMobile = window.innerWidth < 640
    if (isMobile) {
      // On mobile screens, dock above the floating bottom nav bar to prevent clipping
      return {
        bottom: '96px',
        left: '16px',
        right: '16px',
        maxWidth: 'calc(100vw - 32px)',
      }
    }

    const popoverWidth = 360
    const margin = 16
    let left = targetRect.left + targetRect.width / 2 - popoverWidth / 2
    left = Math.max(margin, Math.min(window.innerWidth - popoverWidth - margin, left))

    const spaceBelow = window.innerHeight - targetRect.bottom
    const showBelow = spaceBelow > 220 || targetRect.top < 120

    if (showBelow) {
      return {
        top: `${Math.min(window.innerHeight - 240, targetRect.bottom + 12)}px`,
        left: `${left}px`,
        width: `${popoverWidth}px`,
      }
    } else {
      return {
        bottom: `${Math.max(24, window.innerHeight - targetRect.top + 16)}px`,
        left: `${left}px`,
        width: `${popoverWidth}px`,
      }
    }
  }

  // Hide button if blocking modal is already opened
  if (isModalOpen) {
    return null
  }

  return (
    <>
      {/* 1. NEED HELP FLOATING ENTRY BUTTON (Placed on left side above bottom nav) */}
      {mode === 'closed' && (
        <>
          {/* Desktop floating button */}
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={() => setMode('welcome')}
            className="fixed bottom-24 left-4 sm:left-6 md:left-8 z-30 hidden md:flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border text-text-main hover:bg-soft-accent shadow-lg dark:bg-[#202027] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#272731] dark:shadow-xl transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary active:scale-95"
            aria-label={t(copy.guide.buttonLabel, language)}
            title={t(copy.guide.badge, language)}
          >
            <IconHelpCircle className="w-5 h-5 text-primary dark:text-[#E9A5D1]" />
            <span className={`${bodyFontClass(language)} text-sm font-medium`}>
              {t(copy.guide.buttonLabel, language)}
            </span>
          </button>

          {/* Mobile floating button */}
          <button
            type="button"
            onClick={() => setMode('welcome')}
            className="fixed bottom-24 left-4 z-30 flex md:hidden items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border text-text-main hover:bg-soft-accent shadow-lg dark:bg-[#202027] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#272731] dark:shadow-xl transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary active:scale-95 text-xs font-medium"
            aria-label={t(copy.guide.buttonLabel, language)}
          >
            <IconHelpCircle className="w-4 h-4 text-primary dark:text-[#E9A5D1]" />
            <span className={`${bodyFontClass(language)} text-xs font-medium`}>
              {t(copy.guide.buttonLabel, language)}
            </span>
          </button>
        </>
      )}

      {/* 2. WELCOME MODAL */}
      {mode === 'welcome' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm dark:bg-black/60 transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="aura-guide-welcome-title"
        >
          <div className="w-full max-w-md bg-card border border-border rounded-card p-6 shadow-modal dark:bg-[#202027] dark:border-[#34313D] dark:shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-soft-accent text-primary dark:bg-[#593443] dark:text-[#E9A5D1]">
                <IconCompass className="w-3.5 h-3.5" />
                {t(copy.guide.badge, language)}
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main dark:text-[#C5BECF] dark:hover:text-[#F5F1F7] dark:hover:bg-[#272731] transition-colors"
                aria-label={t(copy.dashboard.close, language)}
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <h2
              id="aura-guide-welcome-title"
              className="font-display text-2xl font-semibold text-text-main dark:text-[#F5F1F7] mb-2 tracking-tight"
            >
              {t(copy.guide.welcomeTitle, language)}
            </h2>

            <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#C5BECF] mb-6 leading-relaxed`}>
              {t(copy.guide.welcomeSubtitle, language)}
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleStartTour}
                className={`${bodyFontClass(language)} w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] dark:text-[#121216] font-medium rounded-data dark:rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center gap-2`}
              >
                <span>{t(copy.guide.startTour, language)}</span>
                <IconChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setMode('explore')}
                className={`${bodyFontClass(language)} w-full py-2.5 px-4 bg-background border border-border hover:bg-card text-text-main dark:bg-[#272731] dark:border-[#34313D] dark:hover:bg-[#302D39] dark:text-[#F5F1F7] font-medium rounded-data dark:rounded-xl transition-all duration-150`}
              >
                {t(copy.guide.exploreFeatures, language)}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className={`${bodyFontClass(language)} w-full py-2 text-sm text-text-muted hover:text-text-main dark:text-[#A39AAA] dark:hover:text-[#F5F1F7] transition-colors text-center mt-1`}
              >
                {t(copy.guide.notNow, language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EXPLORE A FEATURE DIRECTORY */}
      {mode === 'explore' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm dark:bg-black/60 transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="aura-guide-explore-title"
        >
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-card border border-border rounded-card shadow-modal dark:bg-[#202027] dark:border-[#34313D] dark:shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border dark:border-[#34313D]">
              <div>
                <span className="text-xs uppercase tracking-wider text-text-muted dark:text-[#C5BECF] font-medium">
                  {t(copy.guide.badge, language)}
                </span>
                <h2
                  id="aura-guide-explore-title"
                  className="font-display text-xl font-semibold text-text-main dark:text-[#F5F1F7]"
                >
                  {t(copy.guide.exploreTitle, language)}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main dark:text-[#C5BECF] dark:hover:text-[#F5F1F7] dark:hover:bg-[#272731] transition-colors"
                aria-label={t(copy.dashboard.close, language)}
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {/* List / Feature Detail */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selectedFeatureId ? (
                // Feature details view
                (() => {
                  const item = TOUR_STEPS.find((s) => s.id === selectedFeatureId)
                  if (!item) return null
                  const stepCopy = copy.guide.steps[item.copyKey]
                  const actionText = t(copy.guide.actions[item.actionKey], language)
                  const ItemIcon = item.icon

                  return (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => setSelectedFeatureId(null)}
                        className={`${bodyFontClass(language)} flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main dark:text-[#C5BECF] dark:hover:text-[#F5F1F7] font-medium`}
                      >
                        <IconChevronLeft className="w-3.5 h-3.5" />
                        <span>{t(copy.guide.exploreTitle, language)}</span>
                      </button>

                      <div className="p-4 rounded-card dark:rounded-xl bg-background dark:bg-[#272731] border border-border dark:border-[#34313D] space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-card dark:bg-[#202027] border border-border dark:border-[#34313D] flex items-center justify-center text-primary dark:text-[#E9A5D1]">
                            <ItemIcon className="w-5 h-5" />
                          </div>
                          <h3 className="font-display text-lg font-semibold text-text-main dark:text-[#F5F1F7]">
                            {t(stepCopy.title, language)}
                          </h3>
                        </div>

                        <p className={`${bodyFontClass(language)} text-sm text-text-main dark:text-[#C5BECF] leading-relaxed`}>
                          {t(stepCopy.text, language)}
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleContextualAction(item)}
                          className={`${bodyFontClass(language)} flex-1 py-2.5 px-4 bg-primary hover:bg-primary-hover text-white dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] dark:text-[#121216] font-medium rounded-data dark:rounded-xl shadow-sm transition-colors text-center`}
                        >
                          {actionText}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = TOUR_STEPS.findIndex((s) => s.id === item.id)
                            setCurrentStepIndex(idx >= 0 ? idx : 0)
                            setMode('tour')
                          }}
                          className={`${bodyFontClass(language)} py-2.5 px-4 bg-background border border-border hover:bg-card text-text-main dark:bg-[#272731] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#302D39] font-medium rounded-data dark:rounded-xl transition-colors`}
                        >
                          {t(copy.guide.startTour, language)}
                        </button>
                      </div>
                    </div>
                  )
                })()
              ) : (
                // Scannable list of features
                TOUR_STEPS.map((step) => {
                  const stepCopy = copy.guide.steps[step.copyKey]
                  const StepIcon = step.icon

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setSelectedFeatureId(step.id)}
                      className="w-full p-3.5 rounded-data dark:rounded-xl bg-background hover:bg-card border border-border dark:bg-[#272731] dark:hover:bg-[#302D39] dark:border-[#34313D] flex items-center justify-between text-left transition-all duration-150 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-card dark:bg-[#202027] border border-border dark:border-[#34313D] flex items-center justify-center text-primary dark:text-[#E9A5D1] group-hover:scale-105 transition-transform">
                          <StepIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-display text-sm font-semibold text-text-main dark:text-[#F5F1F7]">
                            {t(stepCopy.title, language)}
                          </p>
                          <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF] line-clamp-1`}>
                            {t(stepCopy.summary, language)}
                          </p>
                        </div>
                      </div>
                      <IconChevronRight className="w-4 h-4 text-text-muted dark:text-[#A39AAA] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border dark:border-[#34313D] flex items-center justify-between bg-card dark:bg-[#202027]">
              <button
                type="button"
                onClick={() => setMode('welcome')}
                className={`${bodyFontClass(language)} text-xs text-text-muted hover:text-text-main dark:text-[#C5BECF] dark:hover:text-[#F5F1F7] transition-colors`}
              >
                {t(copy.guide.backToWelcome, language)}
              </button>
              <button
                type="button"
                onClick={handleStartTour}
                className={`${bodyFontClass(language)} text-xs font-semibold text-primary hover:text-primary-hover dark:text-[#E9A5D1] dark:hover:text-[#CE8BB8] transition-colors`}
              >
                {t(copy.guide.startTour, language)} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. GUIDED TOUR CONTEXTUAL STEP */}
      {mode === 'tour' && currentStep && (
        <>
          {/* Target Spotlight Highlight Ring */}
          {targetRect && (
            <div
              style={{
                position: 'fixed',
                top: `${targetRect.top - 6}px`,
                left: `${targetRect.left - 6}px`,
                width: `${targetRect.width + 12}px`,
                height: `${targetRect.height + 12}px`,
                pointerEvents: 'none',
                zIndex: 45,
              }}
              className="rounded-2xl ring-4 ring-primary dark:ring-[#E9A5D1] ring-offset-2 ring-offset-background shadow-2xl transition-all duration-300 animate-pulse"
              aria-hidden="true"
            />
          )}

          {/* Floating Contextual Tooltip Panel */}
          <div
            ref={popoverRef}
            style={getPopoverStyle()}
            className="fixed z-50 p-5 bg-card border border-border rounded-card shadow-2xl dark:bg-[#202027] dark:border-[#34313D] dark:shadow-2xl animate-in fade-in duration-200"
            role="region"
            aria-live="polite"
            aria-label={`${t(copy.guide.badge, language)}: ${t(copy.guide.steps[currentStep.copyKey].title, language)}`}
          >
            {/* Header info */}
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-soft-accent text-primary dark:bg-[#593443] dark:text-[#E9A5D1]">
                {formatCopy(copy.guide.stepIndicator, language, {
                  current: currentStepIndex + 1,
                  total: TOUR_STEPS.length,
                })}
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text-main dark:text-[#C5BECF] dark:hover:text-[#F5F1F7] transition-colors"
                aria-label={t(copy.dashboard.close, language)}
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Title & 20-30 Word Explanation */}
            <h3 className="font-display text-base font-semibold text-text-main dark:text-[#F5F1F7] mb-1.5">
              {t(copy.guide.steps[currentStep.copyKey].title, language)}
            </h3>

            <p className={`${bodyFontClass(language)} text-xs sm:text-sm text-text-main dark:text-[#C5BECF] leading-relaxed mb-4`}>
              {t(copy.guide.steps[currentStep.copyKey].text, language)}
            </p>

            {/* Compact Navigation Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-border dark:border-[#34313D]">
              <button
                type="button"
                onClick={handleClose}
                className={`${bodyFontClass(language)} text-xs text-text-muted hover:text-text-main dark:text-[#A39AAA] dark:hover:text-[#F5F1F7] transition-colors`}
              >
                {t(copy.guide.skipTour, language)}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0}
                  className={`${bodyFontClass(language)} px-3 py-1.5 rounded-data text-xs font-medium border border-border text-text-main hover:bg-background dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#272731] disabled:opacity-40 transition-colors`}
                >
                  {t(copy.guide.back, language)}
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className={`${bodyFontClass(language)} px-3.5 py-1.5 rounded-data text-xs font-semibold bg-primary hover:bg-primary-hover text-white dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] dark:text-[#121216] shadow-sm transition-colors`}
                >
                  {currentStepIndex === TOUR_STEPS.length - 1
                    ? t(copy.guide.finishTour, language)
                    : t(copy.guide.next, language)}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 5. TOUR COMPLETED CELEBRATION MODAL */}
      {mode === 'completed' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm dark:bg-black/60 transition-opacity"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm text-center bg-card border border-border rounded-card p-6 shadow-modal dark:bg-[#202027] dark:border-[#34313D] dark:shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full mx-auto mb-4 bg-soft-accent dark:bg-[#593443] flex items-center justify-center text-primary dark:text-[#E9A5D1]">
              <IconCompass className="w-6 h-6 animate-spin duration-1000" />
            </div>

            <h2 className="font-display text-xl font-semibold text-text-main dark:text-[#F5F1F7] mb-2">
              {t(copy.guide.completedTitle, language)}
            </h2>

            <p className={`${bodyFontClass(language)} text-xs sm:text-sm text-text-muted dark:text-[#C5BECF] mb-6 leading-relaxed`}>
              {t(copy.guide.completedSubtitle, language)}
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleClose}
                className={`${bodyFontClass(language)} w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] dark:text-[#121216] font-medium rounded-data dark:rounded-xl shadow-sm transition-colors`}
              >
                {t(copy.guide.finishTour, language)}
              </button>

              <button
                type="button"
                onClick={() => setMode('explore')}
                className={`${bodyFontClass(language)} w-full py-2 px-4 bg-background border border-border hover:bg-card text-text-main dark:bg-[#272731] dark:border-[#34313D] dark:text-[#F5F1F7] text-xs font-medium rounded-data dark:rounded-xl transition-colors`}
              >
                {t(copy.guide.exploreFeatures, language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
