export type Phase =
  | 'follicular'
  | 'menstrual'
  | 'ovulatory'
  | 'luteal'
  | 'pmos'
  | 'menopause'
  | 'pregnancy_lactation'

export interface User {
  id: string
  name: string
  phase: Phase
}

export interface DailyProgress {
  nutrient: 'iron' | 'calcium' | 'vit_d' | 'b12'
  current: number
  target: number
  percent: number
  unit: string
}

export interface Dashboard {
  user_id: string
  name: string
  phase: Phase
  date: string
  total_energy_kcal: number
  total_protein_g: number
  progress: DailyProgress[]
  recent_logs: number
  disclaimer: string
}

export interface NutrientRisk {
  nutrient: string
  intake: number
  target: number
  percent: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  unit: string
  explanation: string
}

export interface RiskScore {
  user_id: string
  phase: Phase
  window_start: string
  window_end: string
  days_logged: number
  targets: Record<string, number>
  rolling_14d: Record<string, number>
  risk: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'>
  nutrients: NutrientRisk[]
  overall_risk: 'LOW' | 'MEDIUM' | 'HIGH'
  disclaimer: string
}

export interface ParsedItem {
  raw_text: string
  food_name: string
  food_id: string | null
  matched: boolean
  qty_g: number
  serving_description: string
  energy_kcal: number
  protein_g: number
  iron_mg: number
  calcium_mg: number
  vit_d_iu: number
  b12_mcg: number
}

export interface ParsedMeal {
  transcript: string
  items: ParsedItem[]
  total_energy_kcal: number
  total_protein_g: number
  total_iron_mg: number
  total_calcium_mg: number
  total_vit_d_iu: number
  total_b12_mcg: number
  disclaimer: string
}

export interface MealLog {
  id: string
  user_id: string
  food_id: string | null
  food_name: string | null
  logged_at: string
  meal_type: string | null
  qty_g: number
  energy_kcal: number
  protein_g: number
  iron_mg: number
  calcium_mg: number
  vit_d_iu: number
  b12_mcg: number
  notes: string | null
}

export interface CheatDayStatus {
  available: boolean
  used_at: string | null
  cooldown_seconds: number
  days_remaining: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  reply: string
  disclaimer: string
}

export interface ApiError {
  code: string
  message: string
  detail: string | null
}
