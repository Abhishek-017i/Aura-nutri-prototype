import { nutrientLabels, t } from '../lib/copy.ts'
import type { Language } from '../lib/language.tsx'

const NUTRIENT_COLORS: Record<'iron' | 'calcium' | 'vit_d' | 'b12', { stroke: string; track: string; bg: string; icon: string }> = {
  iron: { stroke: '#E88BA8', track: '#F8DDE5', bg: '#FFF5F7', icon: '💧' },
  calcium: { stroke: '#80864A', track: '#F0F0E3', bg: '#F9FAF4', icon: '🦴' },
  vit_d: { stroke: '#D97706', track: '#FEF3C7', bg: '#FFFBEB', icon: '☀️' },
  b12: { stroke: '#C85D80', track: '#F8DDE5', bg: '#FFF5F7', icon: '✨' },
}

interface NutrientRingProps {
  nutrient: 'iron' | 'calcium' | 'vit_d' | 'b12'
  current: number
  target: number
  percent: number
  unit: string
  size?: 'lg' | 'md'
  language?: Language
}

export function NutrientRing({
  nutrient,
  current,
  target,
  percent,
  unit,
  size = 'md',
  language = 'en',
}: NutrientRingProps) {
  const meta = NUTRIENT_COLORS[nutrient] || { stroke: '#E88BA8', track: '#F8DDE5', bg: '#FFF5F7', icon: '🌸' }
  const strokeColor = percent >= 100 ? '#80864A' : meta.stroke

  const label = t(nutrientLabels[nutrient], language)
  const fontClass = language === 'hi' ? 'font-hindi' : 'font-sans'

  // Dimensions
  const isLg = size === 'lg'
  const svgSize = isLg ? 144 : 96
  const strokeWidth = isLg ? 10 : 7
  const radius = (svgSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedPercent = Math.min(Math.max(percent, 0), 100)
  const dashOffset = circumference - (clampedPercent / 100) * circumference

  return (
    <div className="flex flex-col items-center p-3 rounded-2xl bg-card border border-border/80 shadow-sm hover:shadow-card transition-all duration-200 w-full max-w-[170px]">
      <div className="relative flex items-center justify-center" style={{ width: svgSize, height: svgSize }}>
        <svg
          width={svgSize}
          height={svgSize}
          className="-rotate-90 transform"
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={meta.track}
            strokeWidth={strokeWidth}
          />
          {/* Progress Arc */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display font-bold text-lg sm:text-xl text-dark-text tracking-tight">
            {Math.round(percent)}%
          </span>
          <span className="font-sans text-[10px] text-muted font-medium">
            {Math.round(current)}/{Math.round(target)}
          </span>
        </div>
      </div>

      <div className="mt-2 text-center w-full">
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs">{meta.icon}</span>
          <p className={`${fontClass} font-semibold text-xs sm:text-sm text-dark-text truncate`}>
            {label}
          </p>
        </div>
        <p className="text-[10px] text-muted">
          {unit}
        </p>
      </div>
    </div>
  )
}
