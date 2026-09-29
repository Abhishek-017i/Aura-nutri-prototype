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
  username: string
  name: string
  phase: Phase | null
}

export interface UserProfile extends User {
  age: number | null
  gender: string | null
  dietary_preferences: string | null
  target_iron_mg: number
  target_calcium_mg: number
  target_vit_d_iu: number
  target_b12_mcg: number
  current_streak: number
  longest_streak: number
  cheat_charms_available: number
  cheat_charms_used_this_week: number
  created_at: string
  updated_at: string
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
  phase: Phase | null
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

export interface TrendNutrientStatus {
  nutrient: string
  status: 'green' | 'yellow' | 'red'
  intake: number
  target: number
  percent: number
}

export interface TrendDay {
  date: string
  nutrients: TrendNutrientStatus[]
  note: string | null
}

export interface RiskScore {
  user_id: string
  phase: Phase | null
  window_start: string
  window_end: string
  days_logged: number
  targets: Record<string, number>
  rolling_14d: Record<string, number>
  risk: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'>
  nutrients: NutrientRisk[]
  overall_risk: 'LOW' | 'MEDIUM' | 'HIGH'
  trend: TrendDay[]
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
  per_100g_energy_kcal: number
  per_100g_protein_g: number
  per_100g_iron_mg: number
  per_100g_calcium_mg: number
  per_100g_vit_d_iu: number
  per_100g_b12_mcg: number
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

export interface LogMealItem {
  food_id: string | null
  food_name: string
  qty_g: number
  energy_kcal: number
  protein_g: number
  iron_mg: number
  calcium_mg: number
  vit_d_iu: number
  b12_mcg: number
  notes?: string
}

export interface LogMealResponse {
  logs: MealLog[]
  totals: {
    energy_kcal: number
    protein_g: number
    iron_mg: number
    calcium_mg: number
    vit_d_iu: number
    b12_mcg: number
  }
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
  cheat_charms_available: number
  cheat_charms_used_this_week: number
  next_charm_available_on: string | null
}

export interface StreakOut {
  user_id: string
  current_streak: number
  longest_streak: number
  last_log_date: string | null
  cheat_charms_available: number
  cheat_charms_used_this_week: number
  next_charm_available_on: string | null
}

export interface PhaseOut {
  user_id: string
  phase: Phase
  phase_adjusted_at: string | null
  target_iron_mg: number
  target_calcium_mg: number
  target_vit_d_iu: number
  target_b12_mcg: number
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  user_id: string
  username: string
  name: string
  phase: Phase | null
  token: string
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
