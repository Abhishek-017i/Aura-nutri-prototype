import { useCallback, useEffect, useState } from 'react'
import { ChatWindow } from '../components/ChatWindow.tsx'
import { MicButton } from '../components/MicButton.tsx'
import { NutrientRing } from '../components/NutrientRing.tsx'
import { RiskBadge } from '../components/RiskBadge.tsx'
import {
  claimCheatDay,
  createLog,
  getCheatDayStatus,
  getDashboard,
  getRiskScore,
  listLogs,
  parseMeal,
  type CreateLogPayload,
  HTTPError,
} from '../lib/api.ts'
import { useVoice } from '../hooks/useVoice.ts'
import type { CheatDayStatus, Dashboard, MealLog, ParsedMeal, RiskScore, User } from '../lib/types.ts'

interface DashboardProps {
  user: User
}

const NUTRIENT_ORDER: ('iron' | 'calcium' | 'vit_d' | 'b12')[] = [
  'iron',
  'calcium',
  'vit_d',
  'b12',
]

const NUTRIENT_LABELS: Record<string, string> = {
  iron: 'Iron',
  calcium: 'Calcium',
  vit_d: 'Vitamin D',
  b12: 'Vitamin B12',
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

function nowIso() {
  return new Date().toISOString()
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Dashboard({ user }: DashboardProps) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [risk, setRisk] = useState<RiskScore | null>(null)
  const [logs, setLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<ParsedMeal | null>(null)
  const [parseLoading, setParseLoading] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [logLoading, setLogLoading] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  const [cheatDay, setCheatDay] = useState<CheatDayStatus | null>(null)
  const [cheatDayLoading, setCheatDayLoading] = useState(false)

  const [chatOpen, setChatOpen] = useState(false)

  const handleTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text))
  }, [])
  const voice = useVoice({ onTranscript: handleTranscript })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [dash, riskScore, todaysLogs, cheatDayStatus] = await Promise.all([
        getDashboard(user.id),
        getRiskScore(user.id),
        listLogs(user.id, todayIso(), todayIso()),
        getCheatDayStatus(user.id),
      ])
      setDashboard(dash)
      setRisk(riskScore)
      setLogs(todaysLogs)
      setCheatDay(cheatDayStatus)
    } catch (err) {
      if (err instanceof HTTPError) {
        setError(err.message)
      } else {
        setError('Dashboard load nahi ho paya. Retry karein.')
      }
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()
  }, [loadData])

  const handleMicClick = () => {
    if (voice.isListening) {
      voice.stop()
    } else {
      voice.reset()
      voice.start()
    }
  }

  const handleParse = async () => {
    const text = input.trim()
    if (!text) return

    setParseLoading(true)
    setParseError(null)
    setParsed(null)

    try {
      const result = await parseMeal(text)
      setParsed(result)
    } catch (err) {
      setParseError(err instanceof HTTPError ? err.message : 'Samajh nahi aaya. Phir se bolein.')
    } finally {
      setParseLoading(false)
    }
  }

  const handleLog = async () => {
    if (!parsed) return

    const matched = parsed.items.filter((item) => item.matched)
    if (matched.length === 0) {
      setLogError('Koi bhi food match nahi hua. Text edit karke dobara parse karein.')
      return
    }

    setLogLoading(true)
    setLogError(null)

    try {
      const timestamp = nowIso()
      await Promise.all(
        matched.map((item) =>
          createLog({
            user_id: user.id,
            food_id: item.food_id,
            food_name: item.food_name,
            logged_at: timestamp,
            meal_type: 'voice',
            qty_g: item.qty_g,
            energy_kcal: item.energy_kcal,
            protein_g: item.protein_g,
            iron_mg: item.iron_mg,
            calcium_mg: item.calcium_mg,
            vit_d_iu: item.vit_d_iu,
            b12_mcg: item.b12_mcg,
            notes: parsed.transcript,
          } satisfies CreateLogPayload),
        ),
      )
      setInput('')
      setParsed(null)
      await loadData()
    } catch (err) {
      setLogError(err instanceof HTTPError ? err.message : 'Meal log nahi ho paya.')
    } finally {
      setLogLoading(false)
    }
  }

  const handleUseCheatDay = async () => {
    setCheatDayLoading(true)
    try {
      const status = await claimCheatDay(user.id)
      setCheatDay(status)
    } catch (err) {
      if (err instanceof HTTPError) {
        setLogError(err.message)
      }
    } finally {
      setCheatDayLoading(false)
    }
  }

  const progressMap = new Map(dashboard?.progress.map((p) => [p.nutrient, p]))

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error || !dashboard || !risk) {
    return (
      <main className="min-h-screen w-full max-w-dashboard mx-auto px-6 py-8">
        <div className="bg-risk-high/10 border border-risk-high rounded-card p-6">
          <h2 className="font-display text-xl font-semibold text-ink mb-2">
            Error
          </h2>
          <p className="font-sans text-ink mb-4">
            {error ?? 'Unable to load dashboard.'}
          </p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-4 py-2 bg-iron text-paper rounded-data font-sans font-medium"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen w-full max-w-dashboard mx-auto px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Namaste, {dashboard.name}
          </h1>
          <p className="font-sans text-sm text-ink-soft capitalize">
            Phase: {dashboard.phase.replace('_', ' ')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="px-4 py-2 bg-surface border border-line rounded-data font-sans text-sm font-medium text-ink hover:border-iron"
        >
          Assistant
        </button>
      </header>

      <section className="bg-surface border border-line rounded-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <MicButton
            isListening={voice.isListening}
            disabled={!voice.supported}
            onClick={handleMicClick}
          />
          <div className="flex-1 text-center sm:text-left w-full">
            <h2 className="font-display text-xl font-medium text-ink">
              Kya khaya aaj?
            </h2>
            <p className="font-hindi text-base text-ink-soft mb-3">
              Mic dabakar apna khana bolein
            </p>
            <textarea
              value={voice.isListening ? `${input} ${voice.interimTranscript}`.trim() : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Jaise: "ek katori dal, do roti, ek glass doodh"'
              rows={2}
              className="w-full px-4 py-3 bg-paper border border-line rounded-data font-sans text-ink placeholder:text-ink-soft focus-visible:outline-iron resize-none"
            />
            {voice.error && (
              <p className="mt-2 font-sans text-sm text-risk-high">{voice.error}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleParse}
                disabled={parseLoading || !input.trim()}
                className="px-4 py-2 bg-iron text-paper rounded-data font-sans font-medium disabled:opacity-50"
              >
                {parseLoading ? 'Parsing...' : 'Parse meal'}
              </button>
              {parsed && (
                <button
                  type="button"
                  onClick={handleLog}
                  disabled={logLoading}
                  className="px-4 py-2 bg-calcium text-paper rounded-data font-sans font-medium disabled:opacity-50"
                >
                  {logLoading ? 'Logging...' : `Log ${parsed.items.filter((i) => i.matched).length} items`}
                </button>
              )}
            </div>
            {parseError && (
              <p className="mt-2 font-sans text-sm text-risk-high">{parseError}</p>
            )}
            {logError && (
              <p className="mt-2 font-sans text-sm text-risk-high">{logError}</p>
            )}
          </div>
        </div>

        {parsed && (
          <div className="mt-6 border-t border-line pt-4">
            <h3 className="font-display text-base font-medium text-ink mb-3">
              Parsed result
            </h3>
            <ul className="space-y-2">
              {parsed.items.map((item, index) => (
                <li
                  key={index}
                  className="flex flex-wrap items-center justify-between gap-2 border border-line rounded-data p-3"
                >
                  <div>
                    <p className="font-sans text-sm font-medium text-ink">
                      {item.food_name}
                      {!item.matched && (
                        <span className="ml-2 font-sans text-xs text-risk-high">(not matched)</span>
                      )}
                    </p>
                    <p className="font-sans text-xs text-ink-soft">
                      {item.serving_description}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs font-sans">
                    <span className="text-iron">{Math.round(item.iron_mg)} Fe</span>
                    <span className="text-calcium">{Math.round(item.calcium_mg)} Ca</span>
                    <span className="text-vitd">{Math.round(item.vit_d_iu)} D</span>
                    <span className="text-b12">{Math.round(item.b12_mcg)} B12</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-4 text-sm font-sans text-ink-soft">
              <span>{Math.round(parsed.total_energy_kcal)} kcal</span>
              <span>{Math.round(parsed.total_protein_g)}g protein</span>
              <span>{Math.round(parsed.total_iron_mg)}mg iron</span>
            </div>
          </div>
        )}
      </section>

      <section className="bg-surface border border-line rounded-card p-6 mb-6">
        <h2 className="font-display text-lg font-medium text-ink mb-6">
          Aaj ka progress
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
          {NUTRIENT_ORDER.map((key, index) => {
            const p = progressMap.get(key)
            if (!p) return null
            return (
              <NutrientRing
                key={key}
                nutrient={key}
                current={p.current}
                target={p.target}
                percent={p.percent}
                unit={p.unit}
                size={index === 0 ? 'lg' : 'md'}
              />
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2 bg-surface border border-line rounded-card p-6">
          <h2 className="font-display text-lg font-medium text-ink mb-4">
            Aaj ke meals
          </h2>
          {logs.length === 0 ? (
            <div className="border border-dashed border-line rounded-data p-6 text-center">
              <p className="font-sans text-ink-soft">
                Aaj kuch log nahi kiya. Mic dabakar bolein — "ek katori dal, do roti"
              </p>
            </div>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between border border-line rounded-data p-3"
                >
                  <div>
                    <p className="font-sans text-sm font-medium text-ink">
                      {log.food_name ?? 'Unknown food'}
                    </p>
                    <p className="font-sans text-xs text-ink-soft">
                      {formatTime(log.logged_at)} · {Math.round(log.qty_g)}g
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs font-sans">
                    <span className="text-iron">{Math.round(log.iron_mg)} Fe</span>
                    <span className="text-calcium">{Math.round(log.calcium_mg)} Ca</span>
                    <span className="text-vitd">{Math.round(log.vit_d_iu)} D</span>
                    <span className="text-b12">{Math.round(log.b12_mcg)} B12</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-surface border border-line rounded-card p-6">
          <h2 className="font-display text-lg font-medium text-ink mb-4">
            14-day risk
          </h2>
          <div className="mb-4">
            <RiskBadge level={risk.overall_risk} label="Overall" />
          </div>
          <div className="space-y-3">
            {risk.nutrients.map((n) => (
              <div key={n.nutrient}>
                <RiskBadge level={n.risk_level} label={NUTRIENT_LABELS[n.nutrient] ?? n.nutrient} />
                <p className="mt-1 font-sans text-xs text-ink-soft">
                  {n.explanation}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-line">
            <h3 className="font-display text-base font-medium text-ink mb-2">
              Cheat day
            </h3>
            {cheatDay ? (
              <div>
                {cheatDay.available ? (
                  <>
                    <p className="font-sans text-sm text-ink-soft mb-2">
                      Aap ek cheat day use kar sakti hain.
                    </p>
                    <button
                      type="button"
                      onClick={handleUseCheatDay}
                      disabled={cheatDayLoading}
                      className="px-4 py-2 bg-vitd text-paper rounded-data font-sans font-medium disabled:opacity-50"
                    >
                      {cheatDayLoading ? 'Saving...' : 'Use cheat day'}
                    </button>
                  </>
                ) : (
                  <p className="font-sans text-sm text-ink-soft">
                    Cheat day used. Available in {cheatDay.days_remaining} days.
                  </p>
                )}
              </div>
            ) : (
              <div className="h-8 w-32 bg-ink/5 rounded-data animate-pulse" />
            )}
          </div>
        </section>
      </div>

      <p className="mt-8 font-sans text-xs text-ink-soft text-center">
        {dashboard.disclaimer}
      </p>

      {chatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setChatOpen(false)
          }}
        >
          <div className="w-full max-w-chat max-h-[90vh] overflow-hidden">
            <ChatWindow user={user} />
          </div>
        </div>
      )}
    </main>
  )
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen w-full max-w-dashboard mx-auto px-6 py-8 animate-pulse">
      <div className="h-8 w-48 bg-ink/5 rounded-data mb-2" />
      <div className="h-4 w-32 bg-ink/5 rounded-data mb-8" />

      <div className="bg-surface border border-line rounded-card p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-ink/5" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-40 bg-ink/5 rounded-data" />
            <div className="h-4 w-56 bg-ink/5 rounded-data" />
            <div className="h-16 w-full bg-ink/5 rounded-data" />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-card p-6 mb-6">
        <div className="h-6 w-32 bg-ink/5 rounded-data mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-28 h-28 rounded-full bg-ink/5" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-surface border border-line rounded-card p-6 space-y-3">
          <div className="h-6 w-32 bg-ink/5 rounded-data mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full bg-ink/5 rounded-data" />
          ))}
        </div>
        <div className="bg-surface border border-line rounded-card p-6 space-y-3">
          <div className="h-6 w-32 bg-ink/5 rounded-data mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-full bg-ink/5 rounded-data" />
          ))}
        </div>
      </div>
    </main>
  )
}
