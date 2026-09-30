import { RadialBar, RadialBarChart, ResponsiveContainer, PolarAngleAxis } from 'recharts'

import { nutrientLabels, t } from '../lib/copy.ts'
import type { Language } from '../lib/language.tsx'

function ringColor(percent: number): string {
  if (percent >= 100) return '#5F8A68'
  return '#C8953D'
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
  const color = ringColor(percent)
  const data = [{ name: nutrient, value: Math.min(percent, 100), fill: color }]
  const sizeClass = size === 'lg' ? 'w-44 h-44' : 'w-28 h-28'
  const textSize = size === 'lg' ? 'text-2xl' : 'text-lg'
  const subTextSize = size === 'lg' ? 'text-sm' : 'text-xs'

  const label = t(nutrientLabels[nutrient], language)
  const fontClass = language === 'hi' ? 'font-hindi' : 'font-sans'

  return (
    <div className={`${sizeClass} flex flex-col items-center`}>
      <div className="relative w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar dataKey="value" background={{ fill: '#E5DDD3' }} fill={color} cornerRadius={percent > 0 && percent < 100 ? 4 : 0} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display font-semibold ${textSize} text-dark-text`}>
            {Math.round(percent)}%
          </span>
          <span className={`font-sans ${subTextSize} text-muted`}>
            {Math.round(current)} / {Math.round(target)} {unit}
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className={`${fontClass} font-medium ${subTextSize} text-dark-text`}>
          {label}
        </p>
      </div>
    </div>
  )
}
