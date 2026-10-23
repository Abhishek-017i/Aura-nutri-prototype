import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { getDashboard } from '../lib/api.ts'
import type { Dashboard, User, UserProfile } from '../lib/types.ts'

export interface NutriCardProps {
  user?: User | UserProfile
  dashboard?: Dashboard
  onClose: () => void
}

/* --- New Brand Logo (Female silhouette in leaf + plus mark) --- */
function NewAuraLogoSvg({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14.5" stroke="white" strokeWidth="1.5" />
      {/* Woman's profile silhouette curving with leaf lines */}
      <path
        d="M12 7C9.5 9.5 8 13.5 8.5 18C9 22 11.5 25 15 26C11 24.5 10 20 10.5 16C11 12.5 13 10 16 9C15 8 13.5 7.2 12 7Z"
        fill="white"
      />
      <path
        d="M14 9.5C13.2 11 13 12.5 13.5 14C14 15.5 15.2 16.5 16 16.8C15.8 17.5 15.2 18.5 14.5 19C15.8 19 17 18 17.5 16.8C18.2 15 17.5 13 16.8 11.5C16.2 10.5 15 9.8 14 9.5Z"
        fill="white"
      />
      {/* Medical/Wellness Plus Sign Badge on the right */}
      <circle cx="21" cy="16" r="4.5" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.2" />
      <path d="M21 13.5V18.5M18.5 16H23.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function AuraBrandLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return <NewAuraLogoSvg className={className} />
  }

  return (
    <img
      src="/templates/aura-logo.png"
      alt="Aura-Nutri"
      className={`${className} object-contain`}
      onError={() => setHasError(true)}
    />
  )
}

/* --- Reusable Inline SVGs (No Lucide per RULES.md) --- */

function IconFire({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.7 2.3c-.2-.4-.8-.4-1 0C10.6 5.2 8 8.3 8 11c0 2.2 1.8 4 4 4s4-1.8 4-4c0-2.7-2.6-5.8-3.3-8.7ZM12 21c-3.3 0-6-2.7-6-6 0-1.6.6-3 1.6-4.1.2-.3.6-.2.6.2 0 1.9 1.3 3.6 3.2 4.2.3.1.6-.1.6-.4V11c0-.2.2-.4.4-.3 1.6.8 2.6 2.5 2.6 4.3 0 3.3-2.7 6-6 6Z" />
    </svg>
  )
}

function IconDrop({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  )
}

function IconSunburst({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" strokeLinecap="round" />
    </svg>
  )
}

function IconBone({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.7 3.3a2.4 2.4 0 0 0-3.4 0l-1.4 1.4-6.6 6.6a2.4 2.4 0 0 0-3.4 0 2.4 2.4 0 0 0 0 3.4 2.4 2.4 0 0 0 0 3.4 2.4 2.4 0 0 0 3.4 0 2.4 2.4 0 0 0 0-3.4l6.6-6.6 1.4-1.4a2.4 2.4 0 0 0 3.4 0 2.4 2.4 0 0 0 0-3.4z" />
    </svg>
  )
}

function IconHexagon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polygon points="12,2 21,7.2 21,16.8 12,22 3,16.8 3,7.2" />
      <path d="M12 2v20M3 7.2l18 9.6M3 16.8l18-9.6" opacity="0.3" />
    </svg>
  )
}

function IconSun({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="6.7" y2="6.7" />
      <line x1="17.3" y1="17.3" x2="19.07" y2="19.07" />
      <line x1="4.93" y1="19.07" x2="6.7" y2="17.3" />
      <line x1="17.3" y1="6.7" x2="19.07" y2="4.93" />
    </svg>
  )
}

function IconSparkleStar({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z" />
    </svg>
  )
}

function IconSparklesGroup({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 2c0 4.4-3.6 8-8 8 4.4 0 8 3.6 8 8 0-4.4 3.6-8 8-8-4.4 0-8-3.6-8-8z" />
      <path d="M18 14c0 2.2-1.8 4-4 4 2.2 0 4 1.8 4 4 0-2.2 1.8-4 4-4-2.2 0-4-1.8-4-4z" />
    </svg>
  )
}

function IconCrownDoodle({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18L5 8L10 13L12 6L14 13L19 8L21 18H3Z" />
      <circle cx="5" cy="7" r="1" fill="currentColor" />
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="19" cy="7" r="1" fill="currentColor" />
    </svg>
  )
}

function BotanicalLeafSvg({ className = 'w-40 h-60' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 300"
      fill="none"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M 190 280 Q 150 210 130 140 Q 115 80 180 15" opacity="0.85" />
      <path d="M 180 15 C 190 40 185 70 160 85 C 145 70 155 40 180 15 Z" />
      <path d="M 180 15 Q 165 55 160 85" opacity="0.6" />
      <path d="M 145 80 C 110 70 85 90 70 115 C 95 125 125 110 145 80 Z" />
      <path d="M 145 80 Q 105 100 70 115" opacity="0.6" />
      <path d="M 140 125 C 170 120 195 145 190 175 C 165 170 145 150 140 125 Z" />
      <path d="M 140 125 Q 168 150 190 175" opacity="0.6" />
      <path d="M 130 160 C 80 145 40 175 15 210 C 60 225 105 200 130 160 Z" />
      <path d="M 130 160 Q 70 185 15 210" opacity="0.6" />
      <path d="M 145 195 C 180 205 195 240 185 270 C 160 255 145 225 145 195 Z" />
      <path d="M 155 235 C 120 240 95 265 85 290 C 115 295 140 275 155 235 Z" />
    </svg>
  )
}

function SmallLeafCorner({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="1.2">
      <path d="M10 90 Q40 60 85 25" />
      <path d="M85 25 C75 40 60 45 45 40 C55 30 70 25 85 25 Z" />
      <path d="M50 55 C35 60 25 50 30 35 C45 40 50 48 50 55 Z" />
      <path d="M30 75 C18 78 12 70 18 58 C28 64 30 70 30 75 Z" />
    </svg>
  )
}

function IconFlipCamera({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8" />
      <path d="M4 14c0 4.418 3.582 8 8 8s8-3.582 8-8" />
      <polyline points="20 4 20 10 14 10" />
      <polyline points="4 20 4 14 10 14" />
    </svg>
  )
}

function IconGallery({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}

function IconClose({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function IconDownload({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

/* --- Nutrient Data Extraction Helper with Real Dashboard & User Props --- */
interface NutrientStats {
  iron: { current: number; target: number; displayVal: string; percent: number }
  calcium: { current: number; target: number; displayVal: string; percent: number }
  vitD: { current: number; target: number; displayVal: string; percent: number }
  b12: { current: number; target: number; displayVal: string; percent: number }
}

function getNutrientStats(dashboard?: Dashboard, user?: User | UserProfile): NutrientStats {
  // Extract progress array if present
  const progressMap = dashboard?.progress ? new Map(dashboard.progress.map((p) => [p.nutrient, p])) : null
  const pIron = progressMap?.get('iron')
  const pCalcium = progressMap?.get('calcium')
  const pVitD = progressMap?.get('vit_d')
  const pB12 = progressMap?.get('b12')

  // Safely extract from direct dashboard properties or progress items, falling back gracefully
  const dRecord = dashboard as unknown as Record<string, unknown> | undefined
  const uRecord = user as unknown as Record<string, unknown> | undefined

  const dIron = typeof dRecord?.iron_mg === 'number' ? dRecord.iron_mg : undefined
  const dCalcium = typeof dRecord?.calcium_mg === 'number' ? dRecord.calcium_mg : undefined
  const dVitD = typeof dRecord?.vit_d_iu === 'number' ? dRecord.vit_d_iu : typeof dRecord?.vit_d_mcg === 'number' ? dRecord.vit_d_mcg : undefined
  const dB12 = typeof dRecord?.b12_mcg === 'number' ? dRecord.b12_mcg : undefined

  const uIronTgt = typeof uRecord?.target_iron_mg === 'number' ? uRecord.target_iron_mg : undefined
  const uCalciumTgt = typeof uRecord?.target_calcium_mg === 'number' ? uRecord.target_calcium_mg : undefined
  const uVitDTgt = typeof uRecord?.target_vit_d_iu === 'number' ? uRecord.target_vit_d_iu : typeof uRecord?.target_vit_d_mcg === 'number' ? uRecord.target_vit_d_mcg : undefined
  const uB12Tgt = typeof uRecord?.target_b12_mcg === 'number' ? uRecord.target_b12_mcg : undefined

  // Iron
  const ironCur = dIron ?? pIron?.current ?? 18
  const ironTgt = uIronTgt ?? pIron?.target ?? 24
  const ironPct = pIron?.percent ?? Math.min(Math.round((ironCur / (ironTgt || 1)) * 100), 100)
  const ironDisplay = `${ironCur % 1 === 0 ? ironCur : ironCur.toFixed(1)}/${ironTgt % 1 === 0 ? ironTgt : ironTgt.toFixed(1)}`

  // Calcium
  const calCur = dCalcium ?? pCalcium?.current ?? 800
  const calTgt = uCalciumTgt ?? pCalcium?.target ?? 1200
  const calPct = pCalcium?.percent ?? Math.min(Math.round((calCur / (calTgt || 1)) * 100), 100)
  const calDisplay = `${Math.round(calCur)}`

  // Vitamin D
  const vdCur = dVitD ?? pVitD?.current ?? 20
  const vdTgt = uVitDTgt ?? pVitD?.target ?? 28
  const vdPct = pVitD?.percent ?? Math.min(Math.round((vdCur / (vdTgt || 1)) * 100), 100)
  const vdDisplay = `${vdCur % 1 === 0 ? vdCur : vdCur.toFixed(1)}`

  // Vitamin B12
  const b12Cur = dB12 ?? pB12?.current ?? 2.4
  const b12Tgt = uB12Tgt ?? pB12?.target ?? 3.0
  const b12Pct = pB12?.percent ?? Math.min(Math.round((b12Cur / (b12Tgt || 1)) * 100), 100)
  const b12Display = `${Number(b12Cur).toFixed(1)}`

  return {
    iron: { current: ironCur, target: ironTgt, displayVal: ironDisplay, percent: ironPct },
    calcium: { current: calCur, target: calTgt, displayVal: calDisplay, percent: calPct },
    vitD: { current: vdCur, target: vdTgt, displayVal: vdDisplay, percent: vdPct },
    b12: { current: b12Cur, target: b12Tgt, displayVal: b12Display, percent: b12Pct },
  }
}

/* --- Filter Overlay Component with all 6 Templates --- */
interface OverlayProps {
  filterId: number
  todayStr: string
  stats: NutrientStats
  streakDays: number
  onFlipCamera?: () => void
}

function FilterOverlay({ filterId, todayStr, stats, streakDays, onFlipCamera }: OverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 text-white select-none overflow-hidden scale-[0.90] origin-center transition-transform duration-200">
      {/* ============================================================== */}
      {/* FILTER 1: "Minimal Glass"                                     */}
      {/* ============================================================== */}
      {filterId === 1 && (
        <>
          {/* Top Header */}
          <div className="relative z-10 flex items-start justify-between pt-14">
            <div className="flex items-center gap-2">
              <AuraBrandLogo className="h-6 w-auto drop-shadow" />
              <span className="text-white font-medium text-sm tracking-wide drop-shadow">Aura-Nutri</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-medium tracking-wide text-white/90 drop-shadow">{todayStr}</span>
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-white/60 bg-black/30 backdrop-blur-sm text-white">
                <IconFire className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-medium tracking-tight">{streakDays} Day Streak</span>
              </div>
            </div>
          </div>

          {/* Decorative background arc */}
          <svg className="absolute right-0 bottom-24 w-72 h-72 pointer-events-none opacity-25" viewBox="0 0 200 200" fill="none">
            <circle cx="200" cy="200" r="150" stroke="white" strokeWidth="1" />
            <circle cx="200" cy="200" r="190" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
          </svg>

          {/* Bottom Area */}
          <div className="relative z-10 space-y-3 pb-20">
            <div className="pl-1">
              <h1 className="font-serif text-3xl sm:text-4xl leading-[1.05] text-white tracking-normal drop-shadow-md">
                Nourish
                <br />
                yourself
              </h1>
              <div className="w-20 h-[1px] bg-white/40 mt-2.5" />
            </div>

            <div className="rounded-2xl backdrop-blur-md bg-black/40 border border-white/20 p-3.5 shadow-xl">
              <div className="grid grid-cols-4 divide-x divide-white/20 text-center">
                <div className="flex flex-col items-center px-1">
                  <IconDrop className="w-4 h-4 text-white mb-1.5 opacity-90" />
                  <span className="font-sans font-semibold text-xs tracking-tight text-white leading-none">{stats.iron.displayVal}</span>
                  <span className="text-[9px] text-white/70 uppercase tracking-tight mt-0.5">mg</span>
                  <span className="text-[10px] text-white/90 font-medium tracking-wide mt-0.5">Iron</span>
                </div>
                <div className="flex flex-col items-center px-1">
                  <IconSunburst className="w-4 h-4 text-white mb-1.5 opacity-90" />
                  <span className="font-sans font-semibold text-xs tracking-tight text-white leading-none">{stats.calcium.displayVal}</span>
                  <span className="text-[9px] text-white/70 uppercase tracking-tight mt-0.5">mg</span>
                  <span className="text-[10px] text-white/90 font-medium tracking-wide mt-0.5">Calcium</span>
                </div>
                <div className="flex flex-col items-center px-1">
                  <IconSun className="w-4 h-4 text-white mb-1.5 opacity-90" />
                  <span className="font-sans font-semibold text-xs tracking-tight text-white leading-none">{stats.vitD.displayVal}</span>
                  <span className="text-[9px] text-white/70 uppercase tracking-tight mt-0.5">mcg</span>
                  <span className="text-[10px] text-white/90 font-medium tracking-wide mt-0.5">Vit D</span>
                </div>
                <div className="flex flex-col items-center px-1">
                  <IconSparklesGroup className="w-4 h-4 text-white mb-1.5 opacity-90" />
                  <span className="font-sans font-semibold text-xs tracking-tight text-white leading-none">{stats.b12.displayVal}</span>
                  <span className="text-[9px] text-white/70 uppercase tracking-tight mt-0.5">mcg</span>
                  <span className="text-[10px] text-white/90 font-medium tracking-wide mt-0.5">B12</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pl-1 opacity-80">
              <AuraBrandLogo className="h-4 w-auto" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold tracking-wide text-white leading-tight">Aura-Nutri</span>
                <span className="text-[7px] tracking-[0.2em] uppercase text-white/70 leading-tight">YOUR DAILY AURA</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* FILTER 2: "Data-Stack"                                        */}
      {/* ============================================================== */}
      {filterId === 2 && (
        <>
          {/* Top-left diagonal lines accent */}
          <div className="absolute top-0 left-0 w-24 h-24 overflow-hidden pointer-events-none opacity-40">
            <div className="w-32 h-[1px] bg-white rotate-45 origin-top-left translate-x-2 -translate-y-2" />
            <div className="w-32 h-[1.5px] bg-white rotate-45 origin-top-left translate-x-4 -translate-y-2" />
            <div className="w-32 h-[1px] bg-white rotate-45 origin-top-left translate-x-6 -translate-y-2" />
          </div>

          <div className="relative z-10 flex items-start justify-between pt-14">
            <div className="flex items-center gap-2">
              <AuraBrandLogo className="h-6 w-auto drop-shadow" />
              <span className="text-white font-medium text-sm tracking-wide drop-shadow">Aura-Nutri</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-medium tracking-wide text-white/90 drop-shadow">{todayStr}</span>
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-white/60 bg-black/30 backdrop-blur-sm text-white">
                <IconFire className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-medium tracking-tight">{streakDays} Day Streak</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 w-28 h-28 overflow-hidden pointer-events-none opacity-40">
            <div className="w-36 h-[1px] bg-white -rotate-45 origin-bottom-right -translate-x-2 translate-y-2" />
            <div className="w-36 h-[1.5px] bg-white -rotate-45 origin-bottom-right -translate-x-4 translate-y-2" />
            <div className="w-36 h-[1px] bg-white -rotate-45 origin-bottom-right -translate-x-6 translate-y-2" />
          </div>

          <div className="relative z-10 pl-2 mt-4 mb-auto">
            <div className="border-l-2 border-white/80 pl-3">
              <h1 className="font-sans font-black text-3xl tracking-tight leading-[1.02] text-white uppercase drop-shadow-md">
                FUEL
                <br />
                YOUR
                <br />
                GLOW
              </h1>
              <div className="w-16 h-[1.5px] bg-white/70 mt-3" />
            </div>
          </div>

          <div className="relative z-10 pb-20 space-y-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-4 -mx-5 px-5">
            <div className="flex items-center gap-3">
              <IconDrop className="w-4 h-4 text-white shrink-0 opacity-90" />
              <div className="w-24 shrink-0">
                <div className="text-[11px] font-semibold text-white leading-tight">Iron</div>
                <div className="text-[9px] text-white/70 leading-tight">{stats.iron.displayVal} mg</div>
              </div>
              <div className="flex-1 bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full rounded-full transition-all" style={{ width: `${stats.iron.percent}%` }} />
              </div>
              <span className="text-[11px] font-bold text-white w-9 text-right shrink-0">{stats.iron.percent}%</span>
            </div>

            <div className="flex items-center gap-3">
              <IconBone className="w-4 h-4 text-white shrink-0 opacity-90" />
              <div className="w-24 shrink-0">
                <div className="text-[11px] font-semibold text-white leading-tight">Calcium</div>
                <div className="text-[9px] text-white/70 leading-tight">{stats.calcium.displayVal} mg</div>
              </div>
              <div className="flex-1 bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full rounded-full transition-all" style={{ width: `${stats.calcium.percent}%` }} />
              </div>
              <span className="text-[11px] font-bold text-white w-9 text-right shrink-0">{stats.calcium.percent}%</span>
            </div>

            <div className="flex items-center gap-3">
              <IconSun className="w-4 h-4 text-white shrink-0 opacity-90" />
              <div className="w-24 shrink-0">
                <div className="text-[11px] font-semibold text-white leading-tight">Vitamin D</div>
                <div className="text-[9px] text-white/70 leading-tight">{stats.vitD.displayVal} mcg</div>
              </div>
              <div className="flex-1 bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full rounded-full transition-all" style={{ width: `${stats.vitD.percent}%` }} />
              </div>
              <span className="text-[11px] font-bold text-white w-9 text-right shrink-0">{stats.vitD.percent}%</span>
            </div>

            <div className="flex items-center gap-3">
              <IconSparklesGroup className="w-4 h-4 text-white shrink-0 opacity-90" />
              <div className="w-24 shrink-0">
                <div className="text-[11px] font-semibold text-white leading-tight">Vitamin B12</div>
                <div className="text-[9px] text-white/70 leading-tight">{stats.b12.displayVal} mcg</div>
              </div>
              <div className="flex-1 bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full rounded-full transition-all" style={{ width: `${stats.b12.percent}%` }} />
              </div>
              <span className="text-[11px] font-bold text-white w-9 text-right shrink-0">{stats.b12.percent}%</span>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* FILTER 3: "Botanical"                                         */}
      {/* ============================================================== */}
      {filterId === 3 && (
        <>
          <div className="relative z-10 flex items-start justify-between pt-14">
            <div className="flex items-center gap-2">
              <AuraBrandLogo className="h-6 w-auto drop-shadow" />
              <span className="text-white font-medium text-sm tracking-wide drop-shadow">Aura-Nutri</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-medium tracking-wide text-white/90 drop-shadow">{todayStr}</span>
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-white/60 bg-black/30 backdrop-blur-sm text-white">
                <IconFire className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-medium tracking-tight">{streakDays} Day Streak</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pl-1 mt-4 mb-auto">
            <h1 className="font-serif italic text-2xl sm:text-3xl leading-[1.15] text-white drop-shadow-md">
              Healthy
              <br />
              Today,
              <br />
              Happier You ♡
            </h1>
            <div className="w-16 h-[1px] bg-white/50 mt-3" />
          </div>

          <div className="absolute right-0 bottom-28 pointer-events-none translate-x-4 opacity-85">
            <BotanicalLeafSvg className="w-48 h-72 drop-shadow-lg" />
          </div>

          <div className="relative z-10 pb-20 space-y-2.5 pl-1">
            <div className="flex items-center gap-3">
              <IconDrop className="w-4 h-4 text-white opacity-90" />
              <div>
                <div className="text-[11px] font-semibold text-white leading-tight drop-shadow">Iron</div>
                <div className="text-[9px] text-white/80 leading-tight drop-shadow">{stats.iron.displayVal} mg</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IconSunburst className="w-4 h-4 text-white opacity-90" />
              <div>
                <div className="text-[11px] font-semibold text-white leading-tight drop-shadow">Calcium</div>
                <div className="text-[9px] text-white/80 leading-tight drop-shadow">{stats.calcium.displayVal} mg</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IconSun className="w-4 h-4 text-white opacity-90" />
              <div>
                <div className="text-[11px] font-semibold text-white leading-tight drop-shadow">Vitamin D</div>
                <div className="text-[9px] text-white/80 leading-tight drop-shadow">{stats.vitD.displayVal} mcg</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IconSparklesGroup className="w-4 h-4 text-white opacity-90" />
              <div>
                <div className="text-[11px] font-semibold text-white leading-tight drop-shadow">Vitamin B12</div>
                <div className="text-[9px] text-white/80 leading-tight drop-shadow">{stats.b12.displayVal} mcg</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* FILTER 4: "The Star Streak"                                   */}
      {/* ============================================================== */}
      {filterId === 4 && (
        <>
          {/* Top Row: Logo left, Date right */}
          <div className="relative z-10 flex items-start justify-between pt-14">
            <div className="flex items-center gap-2">
              <AuraBrandLogo className="h-6 w-auto drop-shadow" />
              <span className="text-white font-medium text-sm tracking-wide drop-shadow">Aura-Nutri</span>
            </div>
            <span className="text-xs font-medium tracking-wide text-white/90 drop-shadow">{todayStr}</span>
          </div>

          {/* Dynamic Curved Streak Banner Frame */}
          <div className="relative z-10 mt-3 px-1">
            <div className="relative py-3.5 px-4 rounded-3xl border border-white/60 bg-black/20 backdrop-blur-[2px] shadow-lg">
              {/* Star on top right corner of banner */}
              <div className="absolute -top-2.5 -right-2 text-white">
                <IconSparkleStar className="w-6 h-6 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
              </div>

              <div className="flex items-center justify-center gap-3.5">
                <div className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                  <IconFire className="w-9 h-9" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]">
                    {streakDays}
                  </span>
                  <span className="text-xl sm:text-2xl font-black italic tracking-wider text-white uppercase drop-shadow-md">
                    DAY STREAK
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Centered serif text */}
          <div className="relative z-10 text-center my-auto py-2">
            <h2 className="font-serif italic text-2xl sm:text-[26px] text-white font-medium drop-shadow-md tracking-tight leading-snug">
              Consistent choices.
              <br />
              Lasting change.
            </h2>
            <div className="w-16 h-[1px] bg-white/50 mx-auto mt-2.5" />
          </div>

          {/* 4 Circular Gauges */}
          <div className="relative z-10 pb-16">
            <div className="grid grid-cols-4 gap-2 px-1">
              {[
                { name: 'Iron', unit: 'mg', val: stats.iron.displayVal, pct: stats.iron.percent },
                { name: 'Calcium', unit: 'mg', val: stats.calcium.displayVal, pct: stats.calcium.percent },
                { name: 'Vit D', unit: 'mcg', val: stats.vitD.displayVal, pct: stats.vitD.percent },
                { name: 'B12', unit: 'mcg', val: stats.b12.displayVal, pct: stats.b12.percent },
              ].map((g) => {
                const size = 68
                const stroke = 3.5
                const radius = (size - stroke) / 2
                const circumference = 2 * Math.PI * radius
                const strokeDashoffset = circumference - (g.pct / 100) * circumference

                return (
                  <div key={g.name} className="flex flex-col items-center">
                    <div className="relative w-[68px] h-[68px] flex items-center justify-center">
                      <svg width={size} height={size} className="-rotate-90">
                        {/* Background Track Circle */}
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="rgba(0,0,0,0.3)"
                          stroke="rgba(255,255,255,0.25)"
                          strokeWidth={stroke}
                        />
                        {/* Active Progress Ring */}
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="transparent"
                          stroke="white"
                          strokeWidth={stroke}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                        />
                      </svg>
                      {/* Inside circle data */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[11px] font-bold leading-none tracking-tight text-white drop-shadow">
                          {g.val}
                        </span>
                        <span className="text-[8px] text-white/80 font-medium uppercase mt-0.5">{g.unit}</span>
                        {/* Tiny diamond symbol */}
                        <span className="text-[8px] text-white/70 leading-none mt-0.5">◇</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-white tracking-tight mt-1.5 drop-shadow">{g.name}</span>
                  </div>
                )
              })}
            </div>

            {/* Bottom Footer line & Left botanical branch */}
            <div className="relative mt-5">
              <svg className="w-full h-4 overflow-visible" viewBox="0 0 320 20" fill="none">
                <path d="M0 10 Q 80 18, 160 10 T 320 10" stroke="white" strokeWidth="1" opacity="0.35" />
              </svg>
              <div className="absolute left-0 -top-16 opacity-60 pointer-events-none">
                <BotanicalLeafSvg className="w-20 h-28" />
              </div>
              <div className="flex items-center gap-1.5 pl-1 pt-1 opacity-80">
                <AuraBrandLogo className="h-4 w-auto" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold tracking-wide text-white leading-tight">Aura-Nutri</span>
                  <span className="text-[7px] tracking-[0.2em] uppercase text-white/70 leading-tight">YOUR DAILY AURA</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* FILTER 5: "The Y2K Aesthetic"                                 */}
      {/* ============================================================== */}
      {filterId === 5 && (
        <>
          {/* Top Row: Logo with sparkles left, streak badge right */}
          <div className="relative z-10 flex items-start justify-between pt-14">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <AuraBrandLogo className="h-6 w-auto drop-shadow" />
                <div className="relative">
                  <span className="text-white font-medium text-sm tracking-wide drop-shadow">Aura-Nutri</span>
                  <IconSparkleStar className="w-3 h-3 text-white absolute -top-1 -right-3.5 drop-shadow" />
                </div>
              </div>
              <div className="mt-1 pl-1">
                <p className="font-serif italic text-xs tracking-wide text-white drop-shadow leading-tight">Real Nutrition.</p>
                <p className="font-serif italic text-xs tracking-wide text-white drop-shadow leading-tight">Lasting You.</p>
                <div className="w-16 h-[1.5px] bg-white mt-1 rounded-full opacity-80" />
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-medium tracking-wide text-white/90 drop-shadow">{todayStr}</span>
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-white/60 bg-black/30 backdrop-blur-sm text-white">
                <IconFire className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-medium tracking-tight">{streakDays} Day Streak</span>
              </div>
            </div>
          </div>

          {/* Middle: Y2K Big Brush Script & Sparkles */}
          <div className="relative z-10 pl-2 mt-2 mb-auto">
            {/* Crown above Aura */}
            <div className="flex items-center gap-1 mb-[-4px] pl-10 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              <IconCrownDoodle className="w-6 h-6 rotate-12" />
            </div>

            <div className="relative inline-block">
              <span className="block font-serif italic text-3xl sm:text-4xl text-white tracking-tight leading-none drop-shadow-md">
                More
              </span>
              <span
                className="block font-sans font-black text-6xl sm:text-7xl text-white tracking-tighter leading-[0.9] uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
                style={{ textShadow: '0 0 20px rgba(255,255,255,0.4), 0 2px 6px rgba(0,0,0,0.9)' }}
              >
                Aura
              </span>

              {/* Floating Doodle Sparkles */}
              <IconSparkleStar className="w-4 h-4 text-white absolute -left-4 top-10 drop-shadow" />
              <IconSparkleStar className="w-3.5 h-3.5 text-white absolute -right-4 top-8 drop-shadow" />
              <IconSparkleStar className="w-4 h-4 text-white absolute -right-6 top-16 drop-shadow" />

              <span className="block font-serif italic text-3xl sm:text-4xl text-white tracking-tight leading-tight mt-1 pl-3 drop-shadow-md">
                Less
              </span>
              <span className="block font-serif italic font-semibold text-3xl sm:text-4xl text-white tracking-tight leading-none pl-1 drop-shadow-md">
                Overthinking
              </span>
              <div className="w-32 h-[2px] bg-white mt-1.5 rounded-full ml-1" />
            </div>

            <div className="mt-3 pl-1">
              <p className="font-sans font-extrabold text-[11px] sm:text-xs tracking-[0.2em] text-white uppercase drop-shadow">
                GOOD NUTRITION
              </p>
              <p className="font-sans font-extrabold text-[11px] sm:text-xs tracking-[0.2em] text-white uppercase drop-shadow">
                = GOOD VIBES
              </p>
              <div className="w-14 h-[1.5px] bg-white mt-1 opacity-70" />
            </div>
          </div>

          {/* Bottom Floating Pill Container */}
          <div className="relative z-10 pb-16">
            <div className="relative">
              {/* Botanical leaves wrapping around pill ends */}
              <div className="absolute -left-3 -top-3 w-8 h-12 pointer-events-none opacity-90">
                <SmallLeafCorner className="w-8 h-12" />
              </div>
              <div className="absolute -right-3 -top-3 w-8 h-12 pointer-events-none opacity-90 scale-x-[-1]">
                <SmallLeafCorner className="w-8 h-12" />
              </div>

              {/* The Pill Box */}
              <div className="rounded-full border border-white/70 bg-black/40 backdrop-blur-md px-3 py-2 shadow-2xl">
                <div className="grid grid-cols-4 divide-x divide-white/20 text-center">
                  {/* Iron */}
                  <div className="flex flex-col items-center px-1">
                    <IconDrop className="w-3.5 h-3.5 text-white mb-1" />
                    <span className="font-sans font-bold text-[11px] leading-tight text-white drop-shadow">{stats.iron.displayVal} mg</span>
                    <span className="text-[9px] text-white/80 font-medium tracking-wide">Iron</span>
                  </div>

                  {/* Calcium */}
                  <div className="flex flex-col items-center px-1">
                    <IconHexagon className="w-3.5 h-3.5 text-white mb-1" />
                    <span className="font-sans font-bold text-[11px] leading-tight text-white drop-shadow">{stats.calcium.displayVal} mg</span>
                    <span className="text-[9px] text-white/80 font-medium tracking-wide">Calcium</span>
                  </div>

                  {/* Vitamin D */}
                  <div className="flex flex-col items-center px-1">
                    <IconSun className="w-3.5 h-3.5 text-white mb-1" />
                    <span className="font-sans font-bold text-[11px] leading-tight text-white drop-shadow">{stats.vitD.displayVal} mcg</span>
                    <span className="text-[9px] text-white/80 font-medium tracking-wide">Vitamin D</span>
                  </div>

                  {/* Vitamin B12 */}
                  <div className="flex flex-col items-center px-1">
                    <IconSparkleStar className="w-3.5 h-3.5 text-white mb-1" />
                    <span className="font-sans font-bold text-[11px] leading-tight text-white drop-shadow">{stats.b12.displayVal} mcg</span>
                    <span className="text-[9px] text-white/80 font-medium tracking-wide">Vitamin B12</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Callouts flanking the shutter button */}
            <div className="flex items-center justify-between mt-3 px-2">
              <div className="flex items-center gap-1">
                <span className="font-serif italic text-xs text-white drop-shadow leading-tight">
                  Click
                  <br />
                  Your Glow
                </span>
                <span className="text-white text-xs opacity-75">ˏˎ</span>
              </div>
              <div className="text-right">
                <span className="font-serif italic text-xs text-white drop-shadow leading-tight">
                  Better Food
                  <br />
                  Bigger Dreams ♡
                </span>
                <div className="w-16 h-[1px] bg-white ml-auto mt-0.5 opacity-60" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* FILTER 6: "The Elegant Glow"                                  */}
      {/* ============================================================== */}
      {filterId === 6 && (
        <>
          {/* Top Row: Frosted cloud badge left, streak badge right */}
          <div className="relative z-10 flex items-start justify-between pt-14">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-lg">
              <AuraBrandLogo className="h-6 w-auto drop-shadow" />
              <span className="text-white font-medium text-xs tracking-wide drop-shadow">Aura-Nutri</span>
              <IconSparkleStar className="w-3 h-3 text-white ml-0.5" />
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-medium tracking-wide text-white/90 drop-shadow">{todayStr}</span>
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-white/60 bg-black/30 backdrop-blur-sm text-white">
                <IconFire className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-medium tracking-tight">{streakDays} Day Streak</span>
              </div>
            </div>
          </div>

          {/* Middle/Lower: Massive Editorial Text Block with Frosted Cloud Glow */}
          <div className="relative z-10 mt-auto mb-3">
            {/* Frosted cloud card behind headline */}
            <div className="relative inline-block p-4 sm:p-5 rounded-3xl bg-white/15 backdrop-blur-md border border-white/30 shadow-2xl">
              <IconSparkleStar className="w-3.5 h-3.5 text-white absolute top-2 left-2 opacity-80" />

              <h1 className="font-serif font-bold text-3xl sm:text-4xl text-white leading-[1.08] tracking-tight drop-shadow-md">
                Good Food.
                <br />
                Better You.
              </h1>

              {/* Botanical branch sprouting on the right of text */}
              <div className="absolute -right-3 -top-2 w-16 h-24 pointer-events-none opacity-85">
                <BotanicalLeafSvg className="w-16 h-24" />
              </div>

              {/* Cursive subtitle on brushed translucent banner */}
              <div className="mt-3 pt-2 border-t border-white/20">
                <p className="font-serif italic text-xs sm:text-sm text-white/95 leading-tight drop-shadow">
                  Fuel your today. With what your body loves.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Frosted pill with horizontal mini-progress bars */}
          <div className="relative z-10 pb-16">
            <div className="rounded-2xl sm:rounded-full bg-white/20 backdrop-blur-md border border-white/40 p-2.5 sm:px-3 shadow-2xl">
              <div className="grid grid-cols-4 divide-x divide-white/25 text-center">
                {/* Iron */}
                <div className="flex flex-col items-center px-1">
                  <IconDrop className="w-3.5 h-3.5 text-white mb-0.5" />
                  <span className="font-sans font-bold text-[11px] leading-tight text-white drop-shadow">{stats.iron.displayVal} mg</span>
                  <span className="text-[9px] text-white/80 font-medium">Iron</span>
                  <div className="w-10 bg-white/30 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-white h-full rounded-full" style={{ width: `${stats.iron.percent}%` }} />
                  </div>
                </div>

                {/* Calcium */}
                <div className="flex flex-col items-center px-1">
                  <IconHexagon className="w-3.5 h-3.5 text-white mb-0.5" />
                  <span className="font-sans font-bold text-[11px] leading-tight text-white drop-shadow">{stats.calcium.displayVal} mg</span>
                  <span className="text-[9px] text-white/80 font-medium">Calcium</span>
                  <div className="w-10 bg-white/30 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-white h-full rounded-full" style={{ width: `${stats.calcium.percent}%` }} />
                  </div>
                </div>

                {/* Vitamin D */}
                <div className="flex flex-col items-center px-1">
                  <IconSun className="w-3.5 h-3.5 text-white mb-0.5" />
                  <span className="font-sans font-bold text-[11px] leading-tight text-white drop-shadow">{stats.vitD.displayVal} mcg</span>
                  <span className="text-[9px] text-white/80 font-medium">Vitamin D</span>
                  <div className="w-10 bg-white/30 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-white h-full rounded-full" style={{ width: `${stats.vitD.percent}%` }} />
                  </div>
                </div>

                {/* Vitamin B12 */}
                <div className="flex flex-col items-center px-1">
                  <IconSparkleStar className="w-3.5 h-3.5 text-white mb-0.5" />
                  <span className="font-sans font-bold text-[11px] leading-tight text-white drop-shadow">{stats.b12.displayVal} mcg</span>
                  <span className="text-[9px] text-white/80 font-medium">Vitamin B12</span>
                  <div className="w-10 bg-white/30 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-white h-full rounded-full" style={{ width: `${stats.b12.percent}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Centered script above shutter button with doodle leaf */}
            <div className="text-center mt-3">
              <span className="font-serif italic text-sm text-white drop-shadow-md">
                ~ Nourish Your Glow ~
              </span>
            </div>

            {/* Botanical Corner Decorations */}
            <div className="absolute left-0 bottom-4 w-12 h-16 pointer-events-none opacity-80">
              <BotanicalLeafSvg className="w-12 h-16" />
            </div>
            <div className="absolute right-0 bottom-4 w-12 h-16 pointer-events-none opacity-80 scale-x-[-1]">
              <BotanicalLeafSvg className="w-12 h-16" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* --- Main NutriCard Component --- */
export function NutriCard({ user, dashboard: initialDashboard, onClose }: NutriCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const captureContainerRef = useRef<HTMLDivElement>(null)

  const [dashboard, setDashboard] = useState<Dashboard | null>(initialDashboard || null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [activeFilter, setActiveFilter] = useState<number>(1) // 1 to 6
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [cameraError, setCameraError] = useState(false)
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null)
  const [finalImage, setFinalImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch real dashboard if not supplied
  useEffect(() => {
    if (!initialDashboard) {
      getDashboard(user?.id)
        .then(setDashboard)
        .catch((err) => console.warn('Could not fetch real dashboard in NutriCard:', err))
    }
  }, [user?.id, initialDashboard])

  // Fallback demo background image in case camera is unsupported or denied
  const fallbackImage = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1080&h=1920'

  // Initialize and attach camera stream with 9:16 aspect ratio
  useEffect(() => {
    let currentStream: MediaStream | null = null

    async function startCamera() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError(true)
        return
      }

      try {
        setCameraError(false)
        let mediaStream: MediaStream
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode,
              aspectRatio: { ideal: 9 / 16 },
              width: { ideal: 1080 },
              height: { ideal: 1920 },
            },
            audio: false,
          })
        } catch {
          // Fallback if ideal dimensions are unsupported by device
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: false,
          })
        }

        currentStream = mediaStream
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err) {
        console.warn('Camera stream initialization failed:', err)
        setCameraError(true)
      }
    }

    void startCamera()

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [facingMode])

  // Keep video element connected to stream if re-rendered or retaken
  useEffect(() => {
    if (stream && videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream
      }
      void videoRef.current.play().catch(() => {})
    }
  }, [stream, finalImage])

  // Stop stream when closing modal
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    onClose()
  }

  // Toggle camera facing mode (front vs rear)
  const handleFlipCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }

  // Real user and dashboard data formatting
  const todayStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })

  // Extract streak safely from user prop
  const userProfile = user as unknown as Partial<UserProfile> | undefined
  const streakDays = typeof userProfile?.current_streak === 'number' ? userProfile.current_streak : 6

  // Extract real nutrient stats
  const stats = getNutrientStats(dashboard || undefined, user)

  // Step 4: Capture Logic (Strict 9:16 aspect preservation matching native camera exactly)
  const handleCapture = async () => {
    if (isProcessing) return
    setIsProcessing(true)

    try {
      const video = videoRef.current
      let frameDataUrl = ''

      if (video && !cameraError && video.videoWidth > 0 && video.videoHeight > 0) {
        const targetW = 1080
        const targetH = 1920
        const canvas = canvasRef.current || document.createElement('canvas')
        canvas.width = targetW
        canvas.height = targetH
        const ctx = canvas.getContext('2d')

        if (ctx) {
          const vw = video.videoWidth
          const vh = video.videoHeight
          const targetRatio = targetW / targetH // 9 / 16 = 0.5625
          const videoRatio = vw / vh

          let sx = 0
          let sy = 0
          let sWidth = vw
          let sHeight = vh

          if (videoRatio > targetRatio) {
            // Video is wider than 9:16: crop width to 9:16 center (matches object-cover in 9:16 viewfinder)
            sWidth = vh * targetRatio
            sHeight = vh
            sx = (vw - sWidth) / 2
            sy = 0
          } else if (videoRatio < targetRatio) {
            // Video is taller than 9:16: crop height to 9:16 center
            sWidth = vw
            sHeight = vw / targetRatio
            sx = 0
            sy = (vh - sHeight) / 2
          }

          ctx.save()
          if (facingMode === 'user') {
            ctx.translate(targetW, 0)
            ctx.scale(-1, 1)
          }
          // Exact 9:16 to 9:16 draw - zero squeeze, zero zoom distortion, exactly what the camera takes
          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH)
          ctx.restore()

          frameDataUrl = canvas.toDataURL('image/jpeg', 0.95)
        }
      }

      if (!frameDataUrl) {
        frameDataUrl = fallbackImage
      }

      setCapturedFrame(frameDataUrl)

      // Ensure frame image is loaded before triggering html2canvas
      const preloader = new Image()
      preloader.onload = () => {
        setTimeout(async () => {
          if (!captureContainerRef.current) {
            setIsProcessing(false)
            return
          }

          try {
            const renderedCanvas = await html2canvas(captureContainerRef.current, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#000000',
            })
            const pngUrl = renderedCanvas.toDataURL('image/png')
            setFinalImage(pngUrl)
          } catch (canvasErr) {
            console.error('html2canvas rendering error:', canvasErr)
          } finally {
            setIsProcessing(false)
          }
        }, 80)
      }
      preloader.onerror = () => {
        setIsProcessing(false)
      }
      preloader.src = frameDataUrl
    } catch (err) {
      console.error('Capture failed:', err)
      setIsProcessing(false)
    }
  }

  // Download captured image
  const handleDownload = () => {
    if (!finalImage) return
    const a = document.createElement('a')
    a.href = finalImage
    a.download = `AURA-NutriCard-${new Date().toISOString().split('T')[0]}.png`
    a.click()
  }

  // Retake photo: seamlessly clear image overlay and resume video stream
  const handleRetake = () => {
    setCapturedFrame(null)
    setFinalImage(null)
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream
      }
      void videoRef.current.play().catch(() => {})
    }
  }

  const templatesList = [
    { id: 1, label: 'Glass' },
    { id: 2, label: 'Data' },
    { id: 3, label: 'Botanical' },
    { id: 4, label: 'Star' },
    { id: 5, label: 'Y2K' },
    { id: 6, label: 'Elegant' },
  ]

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden select-none">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main View Container - Strict 9:16 Story Card */}
      <div className="relative aspect-[9/16] h-[min(84vh,740px)] w-auto max-w-[calc(min(84vh,740px)*9/16)] rounded-[28px] overflow-hidden bg-black shadow-2xl flex flex-col justify-between border border-white/10">
        {/* Live Camera Feed & Active Overlay - Pure 9:16 Viewfinder (Always mounted) */}
        <div className="relative w-full h-full overflow-hidden bg-black">
          {/* Camera Video Feed */}
          {!cameraError ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          ) : (
            <div className="relative w-full h-full">
              <img
                src={fallbackImage}
                alt="Camera feed placeholder"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
              <div className="absolute top-16 inset-x-4 text-center">
                <span className="inline-block px-2.5 py-1 rounded-full bg-black/60 text-white/80 text-[10px] backdrop-blur-sm border border-white/10">
                  Live camera preview unavailable (using demo feed)
                </span>
              </div>
            </div>
          )}

          {/* Active Filter Overlay */}
          <FilterOverlay
            filterId={activeFilter}
            todayStr={todayStr}
            stats={stats}
            streakDays={streakDays}
            onFlipCamera={handleFlipCamera}
          />

          {/* Top Control Bar: Camera Flip (Left), Filter Options Box (Center), Close (Right) */}
          <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between gap-2 pointer-events-auto">
            {/* Camera Flip Button (Rear to Front / Front to Rear, default Front) */}
            <button
              type="button"
              onClick={handleFlipCamera}
              className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-black/80 active:scale-95 transition-all shadow-lg shrink-0"
              aria-label="Flip camera (rear to front)"
              title={facingMode === 'user' ? 'Switch to Rear Camera' : 'Switch to Front Camera (Selfie)'}
            >
              <IconFlipCamera className="w-4 h-4" />
            </button>

            {/* Filter Switcher Box at Top */}
            <div
              className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-1 rounded-full border border-white/20 shadow-xl overflow-x-auto [&::-webkit-scrollbar]:hidden max-w-[245px] sm:max-w-[265px]"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {templatesList.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide whitespace-nowrap transition-all ${
                    activeFilter === f.id
                      ? 'bg-white text-black font-bold shadow-sm scale-105'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Close Button on Top Right */}
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-black/80 active:scale-95 transition-all shadow-lg shrink-0"
              aria-label="Close camera"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Camera Controls: Clean, Centered Shutter */}
          <div className="absolute bottom-5 inset-x-0 px-8 flex justify-center items-center z-30 pointer-events-auto">
            {/* Shutter Button */}
            <button
              type="button"
              onClick={handleCapture}
              disabled={isProcessing}
              className="w-16 h-16 rounded-full border-4 border-black/40 bg-white shadow-2xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 hover:scale-105"
              aria-label="Capture photo"
            >
              {isProcessing ? (
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-black/20" />
              )}
            </button>
          </div>
        </div>

        {/* Preview of captured final image if ready (Overlays on top without unmounting video) */}
        {finalImage && (
          <div className="absolute inset-0 z-50 flex flex-col justify-between bg-black">
            <img src={finalImage} alt="Captured Nutri-Card" className="w-full h-full object-cover" />

            {/* Action Bar on top */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50">
              <button
                type="button"
                onClick={handleRetake}
                className="px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-medium border border-white/20 hover:bg-black/70 active:scale-95 transition-all shadow-lg"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-black/70 active:scale-95 transition-all shadow-lg"
                aria-label="Close"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="absolute bottom-5 inset-x-0 flex justify-center items-center gap-3 px-4 z-50">
              <button
                type="button"
                onClick={handleDownload}
                className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs tracking-wide shadow-xl flex items-center gap-2 hover:bg-white/90 active:scale-95 transition-all"
              >
                <IconDownload className="w-4 h-4" />
                Download Card
              </button>
            </div>
          </div>
        )}

        {/* Hidden Target Container for html2canvas rendering - Exact 1080x1920 (9:16) */}
        <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none" aria-hidden="true">
          <div
            ref={captureContainerRef}
            className="w-[1080px] h-[1920px] relative overflow-hidden bg-black"
            style={{ fontFamily: "'Source Sans 3', sans-serif" }}
          >
            {capturedFrame && (
              <img
                src={capturedFrame}
                alt="Captured background"
                className="w-[1080px] h-[1920px] absolute inset-0 object-cover"
                crossOrigin="anonymous"
              />
            )}
            {/* Scaled-up Overlay for 1080x1920 rendering */}
            <div className="scale-[2.8421] origin-top-left w-[380px] h-[675.5px] absolute inset-0">
              <FilterOverlay
                filterId={activeFilter}
                todayStr={todayStr}
                stats={stats}
                streakDays={streakDays}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NutriCard
