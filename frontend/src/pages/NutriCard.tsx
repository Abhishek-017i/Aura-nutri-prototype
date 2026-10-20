import { useEffect, useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { getDashboard } from '../lib/api.ts'
//import { useLanguage } from '../lib/useLanguage.ts'
import type { Dashboard, User } from '../lib/types.ts'
import { IconFire, IconLogoPetals } from '../components/icons.tsx'

interface NutriCardProps {
  user: User
  dashboard?: Dashboard
  onClose: () => void
}

const NUTRIENT_ORDER: ('iron' | 'calcium' | 'vit_d' | 'b12')[] = [
  'iron',
  'calcium',
  'vit_d',
  'b12',
]

export function NutriCard({ user, dashboard: initialDashboard, onClose }: NutriCardProps) {
  //const { language } = useLanguage()
  const [dashboard, setDashboard] = useState<Dashboard | null>(initialDashboard || null)
  const [loading, setLoading] = useState(!initialDashboard)
  const [imageSrc, setImageSrc] = useState<string | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!initialDashboard) {
      getDashboard(user.id)
        .then(setDashboard)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [user.id, initialDashboard])

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
    if (!cardRef.current) return
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#332D29'
      })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `AURA-NutriCard-${new Date().toISOString().split('T')[0]}.png`
      a.click()
    } catch (err) {
      console.error('Failed to generate image', err)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur flex items-center justify-center">
        <div className="animate-pulse w-12 h-12 rounded-full bg-primary/20" />
      </div>
    )
  }

  if (!dashboard) return null

  // Ensure default image if not uploaded
  const bgImage = imageSrc || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=1080&h=1920'

  const progressMap = new Map(dashboard.progress.map((p) => [p.nutrient, p]))

  const todayStr = new Date(dashboard.date).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).toUpperCase()

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center overflow-hidden p-4">
      {/* Action Bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-10 max-w-sm mx-auto w-full">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-primary to-primary-dark text-white font-sans text-sm font-semibold flex items-center gap-2 shadow-card hover:scale-105 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Save Card
          </button>
        </div>
      </div>

      {/* Card Container */}
      <div
        ref={cardRef}
        className="w-full max-w-[360px] aspect-[9/16] relative overflow-hidden rounded-[32px] shadow-2xl bg-black"
        style={{
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt="Meal" className="w-full h-full object-cover" crossOrigin="anonymous" />
          {/* Subtle gradient overlay to ensure text legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
        </div>

        {/* Hidden File Input for snapping/uploading */}
        <label className="absolute inset-0 z-10 cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>

        {/* Content Overlay (z-20 so it's above the invisible label but below action buttons outside) */}
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 pb-8">
          {/* Header */}
          <div className="flex justify-between items-start pt-2">
            <div>
              <p className="text-white/80 text-[10px] tracking-[0.2em] font-medium mb-2 uppercase">{todayStr}</p>
              <h1 className="text-white font-bold text-3xl leading-[1.1] tracking-tight mb-2">
                DAILY<br />NUTRITION
              </h1>
              <p className="text-white/80 text-[10px] tracking-[0.15em] uppercase leading-relaxed">
                SMALL CHOICES.<br />BIG IMPACT.
              </p>
            </div>
            <div className="flex flex-col items-center pt-2">
              <div className="flex items-center gap-1 text-white">
                <IconFire className="w-5 h-5 text-primary" />
                <span className="font-bold text-2xl tracking-tighter">6</span>
              </div>
              <span className="text-white/80 text-[8px] font-bold tracking-[0.1em] uppercase mt-1">DAY STREAK</span>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="space-y-6">
            {/* Divider & Header */}
            <div className="flex items-center gap-4">
              <h2 className="text-white text-[11px] font-bold tracking-[0.15em] whitespace-nowrap">NUTRIENT GOALS</h2>
              <div className="h-[1px] flex-1 bg-white/20" />
            </div>

            {/* Rings Grid */}
            <div className="grid grid-cols-4 gap-2">
              {NUTRIENT_ORDER.map((key) => {
                const p = progressMap.get(key)
                if (!p) return null
                const percentVal = Math.min(Math.round((p.current / p.target) * 100), 100)
                const isComplete = percentVal >= 100
                const ringColor = isComplete ? '#80864A' : '#E88BA8' // Olive Green or Primary Pink
                const trackColor = 'rgba(255,255,255,0.18)'

                // SVG Circle math
                const size = 64
                const strokeWidth = 4
                const radius = (size - strokeWidth) / 2
                const circumference = 2 * Math.PI * radius
                const strokeDashoffset = circumference - (percentVal / 100) * circumference

                return (
                  <div key={key} className="flex flex-col items-center">
                    <div className="relative w-16 h-16 flex items-center justify-center mb-2">
                      <svg width={size} height={size} className="transform -rotate-90">
                        {/* Track */}
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="transparent"
                          stroke={trackColor}
                          strokeWidth={strokeWidth}
                        />
                        {/* Progress */}
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
                      <span className="absolute text-white font-bold text-sm tracking-tight">
                        {percentVal}%
                      </span>
                    </div>
                    <span className="text-white font-bold text-[8px] tracking-[0.1em] uppercase mb-0.5">
                      {key === 'vit_d' ? 'VITAMIN D' : key === 'b12' ? 'VITAMIN B12' : key}
                    </span>
                    <span className="text-white/60 text-[8px] font-medium">
                      ({Math.round(p.current)} / {p.target} {p.unit})
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Footer Branding */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <IconLogoPetals className="w-5 h-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-white font-bold text-[12px] tracking-wide">Women Nutri Aura</span>
                  <span className="text-white/50 text-[8px] tracking-[0.15em] uppercase">NUTRITION · BALANCE · VITALITY</span>
                </div>
              </div>
              <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
