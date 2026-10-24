import { RadialBar, RadialBarChart, ResponsiveContainer, PolarAngleAxis } from 'recharts'

import { nutrientLabels, t } from '../lib/copy.ts'
import type { Language } from '../lib/language.tsx'
import { useTheme } from '../contexts/useTheme.ts'
import { getNutrientColor } from '../lib/nutrientColors.ts'

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
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const color = getNutrientColor(nutrient, isDark)
  const clampedPercent = Math.max(0, Math.min(percent, 100))
  const data = [{ name: nutrient, value: clampedPercent, fill: color }]

  // Responsive sizing:
  // lg (Today's Progress dashboard): 112px mobile, 136px sm, 152px md/desktop
  // md: 96px mobile, 112px sm
  const sizeClass = size === 'lg' ? 'w-28 sm:w-36 md:w-38 lg:w-40' : 'w-24 sm:w-28'
  const textSize = size === 'lg' ? 'text-base sm:text-lg md:text-xl' : 'text-sm sm:text-base'
  const subTextSize = size === 'lg' ? 'text-[10px] sm:text-[11px] md:text-xs' : 'text-[9px] sm:text-[10px]'

  const label = t(nutrientLabels[nutrient], language)
  // Track color: #F0E1E6 in light mode per specification, refined dark track #2B2936 in dark mode
  const trackColor = isDark ? '#2B2936' : '#F0E1E6'

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

        {/* Center Content: readable percentage & amount */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-1 text-center">
          <span className={`font-display font-semibold ${textSize} text-text-main dark:text-[#F5F1F7] leading-none mb-0.5 sm:mb-1 tracking-tight`}>
            {Math.round(percent)}%
          </span>
          <span
            className={`font-sans ${subTextSize} text-text-muted dark:text-[#C5BECF] font-medium leading-tight max-w-[90%] truncate`}
            title={`${displayedCurrent} / ${displayedTarget} ${unit}`}
          >
            {displayedCurrent}/{displayedTarget} {unit}
          </span>
        </div>
      </div>

      {/* Nutrient Label under ring with subtle color indicator dot */}
      <div className="mt-2 text-center w-full px-1 flex items-center justify-center gap-1.5 min-w-0">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <p className="font-sans font-medium text-xs sm:text-sm text-text-main dark:text-[#F5F1F7] truncate">
          {label}
        </p>
      </div>
    </div>
  )
}

