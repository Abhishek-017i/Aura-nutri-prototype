import { RadialBar, RadialBarChart, ResponsiveContainer, PolarAngleAxis } from 'recharts'

import { nutrientLabels, t } from '../lib/copy.ts'
import type { Language } from '../lib/language.tsx'
import { useTheme } from '../contexts/useTheme.ts'

function getRingColor(percent: number, nutrient: string, isDark: boolean): string {
  if (!isDark) {
    if (percent >= 100) return 'var(--emerald)'
    return 'var(--amber)'
  }

  // Exact restrained dark mode palette from reference specification:
  // Complete: Supporting teal #8FC5B7
  if (percent >= 100) return '#8FC5B7'

  // Nutrient specific restrained tones
  switch (nutrient) {
    case 'iron':
      return '#876671' // dusty rose
    case 'calcium':
      return '#8FC5B7' // supporting teal
    case 'vit_d':
      return '#DDBA83' // supporting amber
    case 'b12':
      return '#B8A8C9' // supporting lavender
    default:
      return '#D5A8B4' // secondary nutrition accent
  }
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
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const color = getRingColor(percent, nutrient, isDark)
  const data = [{ name: nutrient, value: Math.min(percent, 100), fill: color }]
  const sizeClass = size === 'lg' ? 'w-40 h-40 sm:w-44 sm:h-44' : 'w-28 h-28'
  const textSize = size === 'lg' ? 'text-2xl' : 'text-lg'
  const subTextSize = size === 'lg' ? 'text-sm' : 'text-xs'

  const label = t(nutrientLabels[nutrient], language)
  const fontClass = language === 'hi' ? 'font-hindi' : 'font-sans'
  const trackColor = isDark ? 'rgba(135, 102, 113, 0.18)' : 'var(--border)'

  return (
    <div className={`${sizeClass} flex flex-col items-center justify-between`}>
      <div className="relative w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
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
              cornerRadius={percent > 0 && percent < 100 ? 6 : 0}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display font-semibold ${textSize} text-text-main dark:text-[#29212A]`}>
            {Math.round(percent)}%
          </span>
          <span className={`font-sans ${subTextSize} text-text-muted dark:text-[#5C4850] font-medium`}>
            {Math.round(current)} / {Math.round(target)} {unit}
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className={`${fontClass} font-medium ${subTextSize} text-text-main dark:text-[#29212A]`}>
          {label}
        </p>
      </div>
    </div>
  )
}
