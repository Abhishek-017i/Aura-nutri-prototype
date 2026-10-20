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

import { auth } from './firebase.ts'

export async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser
  if (!user) return {}
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

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
  const auth = await authHeaders()
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...auth,
      ...(options.headers || {}),
    },
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
  return getUser(response.user_id)
}

export async function completeSignup(payload: { name: string; age: number; phase: string }): Promise<UserProfile> {
  return request<UserProfile>(`${API_BASE_URL}/api/users/complete-signup`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getUser(userId?: string): Promise<UserProfile> {
  if (userId) {
    return request<UserProfile>(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}`)
  }
  return request<UserProfile>(`${API_BASE_URL}/api/users/profile`)
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

export async function getDashboard(_userId?: string): Promise<Dashboard> {
  return request<Dashboard>(`${API_BASE_URL}/api/dashboard`)
}

export async function getRiskScore(_userId?: string): Promise<RiskScore> {
  return request<RiskScore>(`${API_BASE_URL}/api/risk-score`)
}

export interface ListLogsOptions {
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export async function listLogs(options: ListLogsOptions = {}): Promise<MealLog[]> {
  const { startDate, endDate, limit, offset } = options
  const url = new URL(`${API_BASE_URL}/api/logs`)
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
  user_id?: string
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
  arg1: string | LogMealItem[],
  arg2?: LogMealItem[] | string | null,
  arg3?: string | null,
): Promise<LogMealResponse> {
  let items: LogMealItem[]
  let mealType: string | null

  if (Array.isArray(arg1)) {
    items = arg1
    mealType = typeof arg2 === 'string' ? arg2 : 'voice'
  } else {
    items = Array.isArray(arg2) ? arg2 : []
    mealType = typeof arg3 === 'string' ? arg3 : 'voice'
  }

  return request<LogMealResponse>(`${API_BASE_URL}/api/log-meal`, {
    method: 'POST',
    body: JSON.stringify({
      items,
      meal_type: mealType,
    }),
  })
}

export async function getStreak(_userId?: string): Promise<StreakOut> {
  return request<StreakOut>(`${API_BASE_URL}/api/streak`)
}

export async function getCheatDayStatus(_userId?: string): Promise<CheatDayStatus> {
  return request<CheatDayStatus>(`${API_BASE_URL}/api/cheat-day`)
}

export async function claimCheatDay(_userId?: string): Promise<CheatDayStatus> {
  return request<CheatDayStatus>(
    `${API_BASE_URL}/api/cheat-day/use`,
    { method: 'POST' },
  )
}

export async function patchPhase(
  arg1: string | { phase?: User['phase']; offset?: number },
  arg2?: { phase?: User['phase']; offset?: number },
): Promise<PhaseOut> {
  const payload = typeof arg1 === 'object' && arg1 !== null ? arg1 : (arg2 || {})
  return request<PhaseOut>(`${API_BASE_URL}/api/phase`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function sendChat(
  arg1: string | ChatMessage[],
  arg2?: ChatMessage[],
): Promise<ChatResponse> {
  const messages = Array.isArray(arg1) ? arg1 : (arg2 || [])
  return request<ChatResponse>(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({ messages }),
  })
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ transcript: string }> {
  const formData = new FormData()
  const filename = audioBlob.type.includes('mp4') || audioBlob.type.includes('mp3')
    ? 'audio.mp3'
    : 'audio.webm'
  formData.append('audio', audioBlob, filename)

  const auth = await authHeaders()
  const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: 'POST',
    headers: {
      ...auth,
    },
    body: formData,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Partial<ApiError>
    throw new HTTPError(response.status, {
      code: body.code ?? 'request_failed',
      message: body.message ?? `Request failed with ${response.status}`,
      detail: body.detail ?? null,
    })
  }

  return (await response.json()) as { transcript: string }
}
