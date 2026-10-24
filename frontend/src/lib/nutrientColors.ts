/**
 * Shared Nutrient Theme Palette
 * Carefully balanced healthcare-inspired palette for women's nutrition & wellness.
 *
 * NOTE: These are product design choices for clear visual hierarchy and recognition,
 * not official medical color standards.
 */

export interface NutrientColorDefinition {
  name: string
  light: string
  dark: string
  rationale: string
}

export const NUTRIENT_COLORS: Record<'iron' | 'calcium' | 'vit_d' | 'b12', NutrientColorDefinition> = {
  iron: {
    name: 'Deep Rose',
    light: '#C65D75',
    dark: '#E07A92', // slightly lifted brightness for AAA dark mode contrast
    rationale: 'Warm accent associated visually with hemoglobin/iron',
  },
  calcium: {
    name: 'Medical Blue',
    light: '#5486C7',
    dark: '#6BA0E5', // slightly lifted brightness for dark mode
    rationale: 'Calm, clinical-looking blue',
  },
  vit_d: {
    name: 'Warm Amber',
    light: '#D99A28',
    dark: '#F0B342', // slightly lifted warm amber for dark mode
    rationale: 'Visual association with sunlight',
  },
  b12: {
    name: 'Healthcare Teal',
    light: '#319B91',
    dark: '#45B5AA', // slightly lifted teal for dark mode
    rationale: 'Clean, distinguishable healthcare accent',
  },
}

export function getNutrientColor(
  nutrient: 'iron' | 'calcium' | 'vit_d' | 'b12' | string,
  isDark = false,
): string {
  const item = NUTRIENT_COLORS[nutrient as keyof typeof NUTRIENT_COLORS]
  if (!item) {
    return isDark ? '#E9A5D1' : '#D9728E'
  }
  return isDark ? item.dark : item.light
}
