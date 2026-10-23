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
  // Complete: Supporting teal #78CBAA
  if (percent >= 100) return '#78CBAA'

  // Nutrient specific restrained tones:
  // Iron: #F08B9C, Calcium: #78CBAA, Vitamin D: #B8C8F4, Vitamin B12: #D7CDF7
  switch (nutrient) {
    case 'iron':
      return '#F08B9C' // Muted rose
    case 'calcium':
      return '#78CBAA' // Teal / Success
    case 'vit_d':
      return '#B8C8F4' // Lavender-blue
    case 'b12':
      return '#D7CDF7' // Soft lavender
    default:
      return '#E9A5D1' // Primary brand pink
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
  const trackColor = isDark ? '#34313D' : 'var(--border)'

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
          <span className={`font-display font-semibold ${textSize} text-text-main dark:text-[#F5F1F7]`}>
            {Math.round(percent)}%
          </span>
          <span className={`font-sans ${subTextSize} text-text-muted dark:text-[#C5BECF] font-medium`}>
            {Math.round(current)} / {Math.round(target)} {unit}
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className={`${fontClass} font-medium ${subTextSize} text-text-main dark:text-[#F5F1F7]`}>
          {label}
        </p>
      </div>
    </div>
  )
}
