import { RadialBar, RadialBarChart, ResponsiveContainer, PolarAngleAxis } from 'recharts'

import { nutrientLabels, t } from '../lib/copy.ts'
import type { Language } from '../lib/language.tsx'
import { useTheme } from '../contexts/useTheme.ts'
import {
  getNutrientColor,
  getNutrientTrackColor,
  getNutrientIconMeta,
} from '../lib/nutrientColors.ts'

interface NutrientRingProps {
  nutrient: 'iron' | 'calcium' | 'vit_d' | 'b12'
  current: number
  target: number
  percent: number
  unit: string
  size?: 'lg' | 'md'
  language?: Language
}

// Healthcare/wellness icons representing each nutrient cleanly
function NutrientIcon({
  nutrient,
  accentColor,
}: {
  nutrient: 'iron' | 'calcium' | 'vit_d' | 'b12'
  accentColor: string
}) {
  switch (nutrient) {
    case 'iron':
      // Blood / hemoglobin droplet
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      )
    case 'calcium':
      // Bone / shield structure
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    case 'vit_d':
      // Sunlight / vitality ray
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )
    case 'b12':
      // Energy spark / metabolic cell
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      )
  }
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
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const color = getNutrientColor(nutrient, isDark)
  const trackColor = getNutrientTrackColor(nutrient, isDark)
  const iconMeta = getNutrientIconMeta(nutrient, isDark)

  const clampedPercent = Math.max(0, Math.min(percent, 100))
  const data = [{ name: nutrient, value: clampedPercent, fill: color }]

  // Responsive sizing:
  // lg (Today's Progress dashboard): 120px mobile, 140px sm, 150px md, 160px lg
  // md: 96px mobile, 112px sm
  const sizeClass = size === 'lg' ? 'w-28 sm:w-36 md:w-38 lg:w-40' : 'w-24 sm:w-28'
  const textSize = size === 'lg' ? 'text-lg sm:text-xl md:text-2xl' : 'text-sm sm:text-base'
  const subTextSize = size === 'lg' ? 'text-[10px] sm:text-[11px] md:text-xs' : 'text-[9px] sm:text-[10px]'

  const label = t(nutrientLabels[nutrient], language)

  // Format consumed / target cleanly without awkward decimal noise
  const formatVal = (v: number) => (v % 1 === 0 ? Math.round(v) : v < 10 ? v.toFixed(1) : Math.round(v))
  const displayedCurrent = formatVal(current)
  const displayedTarget = formatVal(target)

  return (
    <div className={`${sizeClass} flex flex-col items-center justify-between min-w-0 max-w-full select-none`}>
      <div className="relative w-full aspect-square flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="74%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              dataKey="value"
              background={{ fill: trackColor }}
              fill={color}
              cornerRadius={clampedPercent > 0 ? 8 : 0}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center Content: readable percentage & consumed / target amount */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-1 text-center">
          <span className={`font-display font-semibold ${textSize} text-text-main dark:text-[#F5F1F7] leading-none mb-0.5 sm:mb-1 tracking-tight`}>
            {Math.round(percent)}%
          </span>
          <span
            className={`font-sans ${subTextSize} text-text-muted dark:text-[#C5BECF] font-medium leading-tight max-w-[90%] truncate`}
            title={`${displayedCurrent} / ${displayedTarget} ${unit}`}
          >
            {displayedCurrent} / {displayedTarget} {unit}
          </span>
        </div>
      </div>

      {/* Nutrient Icon + Label under ring */}
      <div className="mt-2.5 sm:mt-3 text-center w-full px-1 flex items-center justify-center gap-1.5 min-w-0">
        <span
          className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center shadow-xs"
          style={{ backgroundColor: iconMeta.bg }}
          aria-hidden="true"
        >
          <NutrientIcon nutrient={nutrient} accentColor={iconMeta.accent} />
        </span>
        <p className="font-sans font-medium text-xs sm:text-sm text-text-main dark:text-[#F5F1F7] truncate">
          {label}
        </p>
      </div>
    </div>
  )
}


