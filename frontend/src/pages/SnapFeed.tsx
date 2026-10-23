import { useEffect, useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { getDashboard } from '../lib/api.ts'
import { bodyFontClass, copy, t } from '../lib/copy.ts'
import { useLanguage } from '../lib/useLanguage.ts'
import type { Dashboard, UserProfile } from '../lib/types.ts'
import { IconCamera, IconFire, IconLeaf } from '../components/icons.tsx'

interface SnapFeedProps {
  user: UserProfile
  onOpenNutriCard?: () => void
}

const NUTRIENT_ORDER: ('iron' | 'calcium' | 'vit_d' | 'b12')[] = [
  'iron',
  'calcium',
  'vit_d',
  'b12',
]

export function SnapFeed({ user, onOpenNutriCard }: SnapFeedProps) {
  const { language } = useLanguage()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getDashboard(user.id)
      .then(setDashboard)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.id])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDownload = async () => {
    if (!cardRef.current || saving) return
    setSaving(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#121216',
      })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `AURA-NutriCards-${new Date().toISOString().split('T')[0]}.png`
      a.click()
    } catch (err) {
      console.error('Failed to generate nutri card image', err)
    } finally {
      setSaving(false)
    }
  }

  const bgImage =
    imageSrc ||
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=1080&h=1920'

  const progressMap = new Map((dashboard?.progress || []).map((p) => [p.nutrient, p]))

  const todayStr = (
    dashboard?.date ? new Date(dashboard.date) : new Date()
  ).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).toUpperCase()

  return (
    <div
      data-guide="snap-feed-page"
      className="max-w-dashboard mx-auto px-4 py-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-soft-accent text-primary dark:bg-[#593443] dark:text-[#E9A5D1] mb-2">
            <IconCamera className="w-3.5 h-3.5" />
            {t(copy.guide.steps.snapFeed.title, language)}
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-text-main dark:text-[#F5F1F7]">
            {t(copy.guide.steps.snapFeed.title, language)}
          </h1>
          <p
            className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#C5BECF] mt-1`}
          >
            {t(copy.guide.steps.snapFeed.summary, language)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border text-text-main text-xs font-semibold hover:bg-soft-accent dark:bg-[#202027] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#272731] shadow-sm transition-all">
            <IconCamera className="w-4 h-4 text-primary dark:text-[#E9A5D1]" />
            <span>Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>

          <button
            type="button"
            onClick={handleDownload}
            disabled={saving}
            className={`${bodyFontClass(language)} inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] dark:text-[#121216] shadow-sm disabled:opacity-50 transition-all`}
          >
            <span>{saving ? 'Saving...' : 'Save Card'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full mb-3" />
          <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#C5BECF]`}>
            Loading daily nutri card...
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 pt-2">
          {/* Snap Card Container */}
          <div className="relative group w-full max-w-[340px] aspect-[9/16] overflow-hidden rounded-[28px] shadow-2xl bg-black border border-white/10">
            <div ref={cardRef} className="absolute inset-0 w-full h-full">
              {/* Background Image */}
              <div className="absolute inset-0 z-0">
                <img
                  src={bgImage}
                  alt="Meal"
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
              </div>

              {/* Click-to-upload overlay */}
              <label className="absolute inset-0 z-10 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>

              {/* Content Overlay */}
              <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 pb-8">
                {/* Card Header */}
                <div className="flex justify-between items-start pt-2">
                  <div>
                    <p className="text-white/80 text-[10px] tracking-[0.2em] font-medium mb-1.5 uppercase">
                      {todayStr}
                    </p>
                    <h2 className="text-white font-bold text-2xl leading-[1.1] tracking-tight mb-1.5">
                      DAILY<br />NUTRITION
                    </h2>
                    <p className="text-white/80 text-[9px] tracking-[0.15em] uppercase leading-relaxed">
                      SMALL CHOICES.<br />BIG IMPACT.
                    </p>
                  </div>
                  <div className="flex flex-col items-center pt-1">
                    <div className="flex items-center gap-1 text-white">
                      <IconFire className="w-5 h-5 text-white" />
                      <span className="font-bold text-2xl tracking-tighter">
                        {user.current_streak || 6}
                      </span>
                    </div>
                    <span className="text-white/80 text-[8px] font-bold tracking-[0.1em] uppercase mt-0.5">
                      DAY STREAK
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Rings & Goals */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="text-white text-[10px] font-bold tracking-[0.15em] whitespace-nowrap">
                      NUTRIENT GOALS
                    </span>
                    <div className="h-[1px] flex-1 bg-white/20" />
                  </div>

                  {/* Rings Grid */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {NUTRIENT_ORDER.map((key) => {
                      const p = progressMap.get(key)
                      const currentVal = p?.current || 0
                      const targetVal = p?.target || 1
                      const percentVal = Math.min(
                        Math.round((currentVal / targetVal) * 100),
                        100,
                      )
                      const isComplete = percentVal >= 100
                      const ringColor = isComplete ? '#78CBAA' : '#E9A5D1'
                      const trackColor = 'rgba(255,255,255,0.18)'

                      const size = 56
                      const strokeWidth = 3.5
                      const radius = (size - strokeWidth) / 2
                      const circumference = 2 * Math.PI * radius
                      const strokeDashoffset =
                        circumference - (percentVal / 100) * circumference

                      return (
                        <div key={key} className="flex flex-col items-center">
                          <div className="relative w-14 h-14 flex items-center justify-center mb-1">
                            <svg
                              width={size}
                              height={size}
                              className="transform -rotate-90"
                            >
                              <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="transparent"
                                stroke={trackColor}
                                strokeWidth={strokeWidth}
                              />
                              <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="transparent"
                                stroke={ringColor}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-white font-bold text-xs tracking-tight">
                              {percentVal}%
                            </span>
                          </div>
                          <span className="text-white font-bold text-[8px] tracking-[0.08em] uppercase mb-0.5">
                            {key === 'vit_d'
                              ? 'VIT D'
                              : key === 'b12'
                              ? 'B12'
                              : key}
                          </span>
                          <span className="text-white/60 text-[7px] font-medium">
                            {Math.round(currentVal)} {p?.unit || ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Card Footer Branding */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/15">
                    <div className="flex items-center gap-1.5">
                      <IconLeaf className="w-4 h-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-[11px] tracking-wide">
                          AURA-Nutri
                        </span>
                        <span className="text-white/60 text-[7px] tracking-[0.12em] uppercase">
                          YOUR DAILY AURA
                        </span>
                      </div>
                    </div>
                    <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">
                      nutri card
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Info & Instructions Card */}
          <div className="w-full max-w-sm space-y-4">
            <div className="p-6 rounded-card border border-border bg-card dark:bg-[#202027] dark:border-[#34313D] space-y-4 shadow-sm">
              <h3 className="font-display text-lg font-semibold text-text-main dark:text-[#F5F1F7]">
                How Nutri Cards Work
              </h3>
              <p
                className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#C5BECF] leading-relaxed`}
              >
                {t(copy.guide.steps.snapFeed.text, language)}
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-soft-accent dark:bg-[#272731] flex items-center justify-center text-xs font-semibold text-primary dark:text-[#E9A5D1] shrink-0 mt-0.5">
                    1
                  </div>
                  <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF]`}>
                    Tap anywhere on the card or use <strong>Upload Photo</strong> to personalize your meal background.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-soft-accent dark:bg-[#272731] flex items-center justify-center text-xs font-semibold text-primary dark:text-[#E9A5D1] shrink-0 mt-0.5">
                    2
                  </div>
                  <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF]`}>
                    Your daily micronutrient completion (Iron, Calcium, Vit D, B12) and streak automatically update as you log meals.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-soft-accent dark:bg-[#272731] flex items-center justify-center text-xs font-semibold text-primary dark:text-[#E9A5D1] shrink-0 mt-0.5">
                    3
                  </div>
                  <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF]`}>
                    Tap <strong>Save Card</strong> to export a high-resolution PNG ready for your Instagram Stories or personal wellness journal.
                  </p>
                </div>
              </div>

              {onOpenNutriCard && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenNutriCard}
                    className={`${bodyFontClass(language)} w-full py-2.5 px-4 rounded-xl border border-border dark:border-[#34313D] text-text-main dark:text-[#F5F1F7] hover:bg-soft-accent/50 dark:hover:bg-[#272731] text-xs font-medium transition-colors`}
                  >
                    Open Fullscreen Story Mode
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
