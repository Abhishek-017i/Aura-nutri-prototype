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
  trackLight: string
  trackDark: string
  iconAccent: string
  iconBgLight: string
  iconBgDark: string
  rationale: string
}

export const NUTRIENT_COLORS: Record<'iron' | 'calcium' | 'vit_d' | 'b12', NutrientColorDefinition> = {
  iron: {
    name: 'Deep Medical Rose Red',
    light: '#C43D5B',
    dark: '#E05A78', // slightly lifted brightness for dark theme contrast
    trackLight: '#F3D6DE',
    trackDark: '#38222A',
    iconAccent: '#C43D5B',
    iconBgLight: '#FBE8ED',
    iconBgDark: '#2E1A22',
    rationale: 'Deep medical rose-red associated visually with blood and hemoglobin',
  },
  calcium: {
    name: 'Clean Medical Blue',
    light: '#4F91E8',
    dark: '#68A4F3',
    trackLight: '#DCE8FA',
    trackDark: '#1E2838',
    iconAccent: '#4F91E8',
    iconBgLight: '#EAF2FF',
    iconBgDark: '#182232',
    rationale: 'Calm, clinical medical blue',
  },
  vit_d: {
    name: 'Warm Golden Amber',
    light: '#E5A126',
    dark: '#F5B33C',
    trackLight: '#F7E8C9',
    trackDark: '#362B1D',
    iconAccent: '#D99516',
    iconBgLight: '#FFF2D6',
    iconBgDark: '#2C2214',
    rationale: 'Warm golden amber representing sunlight',
  },
  b12: {
    name: 'Distinct Healthcare Teal',
    light: '#168F83',
    dark: '#26ABA0',
    trackLight: '#D2EBE6',
    trackDark: '#192C29',
    iconAccent: '#168F83',
    iconBgLight: '#E1F4EF',
    iconBgDark: '#142624',
    rationale: 'Crisp, distinguishable healthcare teal',
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

export function getNutrientTrackColor(
  nutrient: 'iron' | 'calcium' | 'vit_d' | 'b12' | string,
  isDark = false,
): string {
  const item = NUTRIENT_COLORS[nutrient as keyof typeof NUTRIENT_COLORS]
  if (!item) {
    return isDark ? '#2B2936' : '#F0E1E6'
  }
  return isDark ? item.trackDark : item.trackLight
}

export function getNutrientIconMeta(
  nutrient: 'iron' | 'calcium' | 'vit_d' | 'b12' | string,
  isDark = false,
) {
  const item = NUTRIENT_COLORS[nutrient as keyof typeof NUTRIENT_COLORS]
  if (!item) {
    return {
      accent: isDark ? '#E9A5D1' : '#D9728E',
      bg: isDark ? '#272731' : '#FCE4EC',
    }
  }
  return {
    accent: isDark ? item.dark : item.iconAccent,
    bg: isDark ? item.iconBgDark : item.iconBgLight,
  }
}
