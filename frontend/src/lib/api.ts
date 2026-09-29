import type {
  ApiError,
  ChatMessage,
  ChatResponse,
  CheatDayStatus,
  Dashboard,
  LogMealItem,
  LogMealResponse,
  LoginPayload,
  LoginResponse,
  MealLog,
  ParsedMeal,
  PhaseOut,
  RiskScore,
  StreakOut,
  User,
  UserProfile,
} from './types.ts'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export class HTTPError extends Error {
  status: number
  code: string
  detail: string | null

  constructor(status: number, error: ApiError) {
    super(error.message)
    this.status = status
    this.code = error.code
    this.detail = error.detail ?? null
    this.name = 'HTTPError'
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Partial<ApiError>
    throw new HTTPError(response.status, {
      code: body.code ?? 'request_failed',
      message: body.message ?? `Request failed with ${response.status}`,
      detail: body.detail ?? null,
    })
  }

  return (await response.json()) as T
}

export async function login(payload: LoginPayload): Promise<UserProfile> {
  const response = await request<LoginResponse>(`${API_BASE_URL}/api/users/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  // The login endpoint returns a session identifier (user_id) and basic identity.
  // Hydrate the full profile from the user endpoint so targets, streak, and
  // cheat-charm state match the server rather than using hardcoded defaults.
  return getUser(response.user_id)
}

export async function getUser(userId: string): Promise<UserProfile> {
  return request<UserProfile>(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}`)
}

export async function updateUser(
  userId: string,
  payload: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>,
): Promise<UserProfile> {
  return request<UserProfile>(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function getDashboard(userId: string): Promise<Dashboard> {
  return request<Dashboard>(`${API_BASE_URL}/api/dashboard/${userId}`)
}

export async function getRiskScore(userId: string): Promise<RiskScore> {
  return request<RiskScore>(`${API_BASE_URL}/api/risk-score/${userId}`)
}

export interface ListLogsOptions {
  userId: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export async function listLogs(options: ListLogsOptions): Promise<MealLog[]> {
  const { userId, startDate, endDate, limit, offset } = options
  const url = new URL(`${API_BASE_URL}/api/logs`)
  url.searchParams.set('user_id', userId)
  if (startDate) url.searchParams.set('start_date', startDate)
  if (endDate) url.searchParams.set('end_date', endDate)
  if (limit !== undefined) url.searchParams.set('limit', String(limit))
  if (offset !== undefined) url.searchParams.set('offset', String(offset))
  return request<MealLog[]>(url.toString())
}

export async function parseMeal(text: string): Promise<ParsedMeal> {
  return request<ParsedMeal>(`${API_BASE_URL}/api/parse-meal`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export interface CreateLogPayload {
  user_id: string
  food_id: string | null
  food_name: string
  logged_at: string
  meal_type: string | null
  qty_g: number
  energy_kcal: number
  protein_g: number
  iron_mg: number
  calcium_mg: number
  vit_d_iu: number
  b12_mcg: number
  notes?: string
}

export async function createLog(payload: CreateLogPayload): Promise<MealLog> {
  return request<MealLog>(`${API_BASE_URL}/api/logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function logMeal(
  userId: string,
  items: LogMealItem[],
  mealType: string | null = 'voice',
): Promise<LogMealResponse> {
  return request<LogMealResponse>(`${API_BASE_URL}/api/log-meal`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      items,
      meal_type: mealType,
    }),
  })
}

export async function getStreak(userId: string): Promise<StreakOut> {
  return request<StreakOut>(`${API_BASE_URL}/api/streak/${encodeURIComponent(userId)}`)
}

export async function getCheatDayStatus(userId: string): Promise<CheatDayStatus> {
  return request<CheatDayStatus>(`${API_BASE_URL}/api/cheat-day/${encodeURIComponent(userId)}`)
}

export async function claimCheatDay(userId: string): Promise<CheatDayStatus> {
  return request<CheatDayStatus>(
    `${API_BASE_URL}/api/cheat-day/use/${encodeURIComponent(userId)}`,
    { method: 'POST' },
  )
}

export async function patchPhase(
  userId: string,
  payload: { phase?: User['phase']; offset?: number },
): Promise<PhaseOut> {
  return request<PhaseOut>(`${API_BASE_URL}/api/phase/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function sendChat(userId: string, messages: ChatMessage[]): Promise<ChatResponse> {
  return request<ChatResponse>(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, messages }),
  })
}
