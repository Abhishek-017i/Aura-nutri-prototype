import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'

const NUTRIENT_COLORS: Record<string, string> = {
  iron: '#B7410E',
  calcium: '#2F6B5E',
  vit_d: '#C98A12',
  b12: '#6B4FA0',
}

const HINDI_LABELS: Record<string, string> = {
  iron: 'लोहा',
  calcium: 'कैल्शियम',
  vit_d: 'विटामिन डी',
  b12: 'विटामिन बी12',
}

const ENGLISH_LABELS: Record<string, string> = {
  iron: 'Iron',
  calcium: 'Calcium',
  vit_d: 'Vitamin D',
  b12: 'Vitamin B12',
}

interface NutrientRingProps {
  nutrient: 'iron' | 'calcium' | 'vit_d' | 'b12'
  current: number
  target: number
  percent: number
  unit: string
  size?: 'lg' | 'md'
}

export function NutrientRing({
  nutrient,
  current,
  target,
  percent,
  unit,
  size = 'md',
}: NutrientRingProps) {
  const data = [{ name: nutrient, value: Math.min(percent, 100), fill: NUTRIENT_COLORS[nutrient] }]
  const sizeClass = size === 'lg' ? 'w-44 h-44' : 'w-28 h-28'
  const textSize = size === 'lg' ? 'text-2xl' : 'text-lg'
  const subTextSize = size === 'lg' ? 'text-sm' : 'text-xs'

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
            <RadialBar
              dataKey="value"
              background
              fill={NUTRIENT_COLORS[nutrient]}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display font-semibold ${textSize} text-ink`}>
            {Math.round(percent)}%
          </span>
          <span className={`font-sans ${subTextSize} text-ink-soft`}>
            {Math.round(current)} / {Math.round(target)} {unit}
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className={`font-sans font-medium ${subTextSize} text-ink`}>
          {ENGLISH_LABELS[nutrient]}
        </p>
        <p
          className={`font-hindi ${subTextSize}`}
          style={{ color: NUTRIENT_COLORS[nutrient] }}
        >
          {HINDI_LABELS[nutrient]}
        </p>
      </div>
    </div>
  )
}
