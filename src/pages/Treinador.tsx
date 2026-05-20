import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SwimMetricRow {
  date:                   string
  dolphin_kicks_wall:     number | null
  underwater_dist_wall_m: number | null
  dolphin_kicks_10m:      number | null
  stroke_count_wall:      number | null
  stroke_count_arms_only: number | null
}

const TECH_METRICS = [
  { key: 'dolphin_kicks_wall'     as const, label: 'Dolphin kicks (parede)', unit: 'kicks', color: '#22d3ee', desc: 'Ideal: 5–7 · menos = mais potência' },
  { key: 'underwater_dist_wall_m' as const, label: 'Distância subaquática',  unit: 'm',     color: '#60a5fa', desc: 'Ideal: 7–10m · mais = melhor'        },
  { key: 'dolphin_kicks_10m'      as const, label: 'Kicks / 10m',            unit: 'kicks', color: '#a78bfa', desc: 'Ideal: 5–8 · parado, sem impulso'     },
  { key: 'stroke_count_wall'      as const, label: 'Braçadas (c/ pernas)',   unit: 'braç.', color: '#fb923c', desc: 'Ideal: 13–17 · menos = melhor'        },
  { key: 'stroke_count_arms_only' as const, label: 'Braçadas (só braçada)',  unit: 'braç.', color: '#f472b6', desc: 'Ideal: 13–17 · menos = mais força'    },
] as const

// Normalização para o Índice Técnico (0–100%)
const TECH_SCORING: Record<string, { ideal: number; worst: number; higherIsBetter: boolean }> = {
  dolphin_kicks_wall:     { ideal: 5,  worst: 12, higherIsBetter: false },
  underwater_dist_wall_m: { ideal: 10, worst: 5,  higherIsBetter: true  },
  dolphin_kicks_10m:      { ideal: 5,  worst: 15, higherIsBetter: false },
  stroke_count_wall:      { ideal: 13, worst: 25, higherIsBetter: false },
  stroke_count_arms_only: { ideal: 13, worst: 25, higherIsBetter: false },
}

function metricScore(key: string, value: number): number {
  const s = TECH_SCORING[key]
  if (!s) return 0
  const raw = s.higherIsBetter
    ? (value - s.worst) / (s.ideal - s.worst)
    : (s.worst - value) / (s.worst - s.ideal)
  return Math.round(Math.min(100, Math.max(0, raw * 100)))}


const tooltipStyle = {
  contentStyle: {
    background: '#0d1117',
    border: '1px solid #1f2937',
    borderRadius: 10,
    fontSize: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: '#6b7280' },
}

interface SwimTime    { id: string; date: string; time_seconds: number }
interface Session     { id: string; date: string; day_type: string; difficulty: number }
interface Progression { id: string; date: string; exercise: string; load_kg: number }
interface Note        { id: string; date: string; type: string; content: string }

interface SwimMetric {
  id: string
  date: string
  // empurrão da parede
  dolphin_kicks_wall:      number | null
  underwater_dist_wall_m:  number | null
  dolphin_kicks_10m:       number | null
  stroke_count_wall:       number | null
  stroke_count_arms_only:  number | null
  notes:                   string | null
}

type Trend = 'improving' | 'plateau' | 'regressing' | 'insufficient'

// ─── Constants ────────────────────────────────────────────────────────────────

const GOAL       = 12.0
const START_TIME = 13.90

// Grouped metric definitions
const GROUPS = [
  {
    id:    'wall',
    label: 'Empurrão da parede',
    desc:  'Métricas a partir de empurrão da parede (sem salto) — mais fácil de medir no treino diário',
    items: [
      {
        key:   'dolphin_kicks_wall' as const,
        label: 'Dolphin kicks',
        unit:  'kicks', step: '1', min: '1', max: '15',
        tip:   'Kicks após empurrão da parede até surfaçar. Ideal: 5–7 kicks fortes e compactos.',
        ideal: '5–7', icon: '🐬',
      },
      {
        key:   'underwater_dist_wall_m' as const,
        label: 'Distância subaquática',
        unit:  'm', step: '0.5', min: '1', max: '15',
        tip:   'Metros em underwater após empurrão da parede. Ideal: 7–10m para um atleta de 196cm.',
        ideal: '7–10 m', icon: '📏',
      },
      {
        key:   'dolphin_kicks_10m' as const,
        label: 'Dolphin kicks / 10m',
        unit:  'kicks', step: '1', min: '1', max: '15',
        tip:   'Corpo parado, sem impulso — conta quantos dolphin kicks precisas para percorrer 10m em underwater. Mede a potência isolada do kick, sem momentum da parede. Objetivo: reduzir ao longo do tempo.',
        ideal: '5–8', icon: '🐬',
      },
      {
        key:   'stroke_count_wall' as const,
        label: 'Braçadas em 25m',
        unit:  'braçadas', step: '1', min: '5', max: '40',
        tip:   'Ciclos de braçada desde o breakout até à parede, após empurrão. Ideal para 196cm: 13–17 braçadas.',
        ideal: '13–17', icon: '🤿',
      },
      {
        key:   'stroke_count_arms_only' as const,
        label: 'Braçadas (só braçada)',
        unit:  'braçadas', step: '1', min: '5', max: '40',
        tip:   'Ciclos de braçada em 25m com pernas paradas ou pull buoy — mede a força da braçada isolada. Objetivo: reduzir ao longo do tempo (braçadas mais largas e eficientes).',
        ideal: '13–17', icon: '💪',
      },
    ],
  },
] as const

type MetricKey =
  | 'dolphin_kicks_wall' | 'underwater_dist_wall_m' | 'dolphin_kicks_10m'
  | 'stroke_count_wall'  | 'stroke_count_arms_only'

type MetricForm = Record<MetricKey, string> & { date: string; notes: string }

const emptyForm = (): MetricForm => ({
  date:                    new Date().toISOString().split('T')[0],
  dolphin_kicks_wall:      '',
  underwater_dist_wall_m:  '',
  dolphin_kicks_10m:       '',
  stroke_count_wall:       '',
  stroke_count_arms_only:  '',
  notes:                   '',
})

// ─── Math helpers ─────────────────────────────────────────────────────────────

function weeklyRate(times: SwimTime[]): number | null {
  if (times.length < 2) return null
  const n  = times.length
  const x  = times.map(t => new Date(t.date).getTime() / (7 * 86_400_000))
  const y  = times.map(t => t.time_seconds)
  const mx = x.reduce((a, b) => a + b) / n
  const my = y.reduce((a, b) => a + b) / n
  const num = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0)
  const den = x.reduce((s, xi) => s + (xi - mx) ** 2, 0)
  return den === 0 ? null : num / den
}

function etaFromRate(times: SwimTime[], rate: number | null): string | null {
  if (!rate || rate >= 0 || !times.length) return null
  const latest     = times[times.length - 1]
  const weeksLeft  = (latest.time_seconds - GOAL) / Math.abs(rate)
  const ms         = new Date(latest.date).getTime() + weeksLeft * 7 * 86_400_000
  return new Date(ms).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
}

function avgSessionsPerWeek(sessions: Session[]): number {
  if (!sessions.length) return 0
  const cutoff = new Date(Date.now() - 28 * 86_400_000)
  return Math.round((sessions.filter(s => new Date(s.date) >= cutoff).length / 4) * 10) / 10
}

function trendStatus(times: SwimTime[]): Trend {
  if (times.length < 3) return 'insufficient'
  const last = times.slice(-3)
  const avg  = ((last[1].time_seconds - last[0].time_seconds) + (last[2].time_seconds - last[1].time_seconds)) / 2
  if (avg < -0.05) return 'improving'
  if (avg >  0.05) return 'regressing'
  return 'plateau'
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  swimTimes:    SwimTime[],
  sessions:     Session[],
  progressions: Progression[],
  notes:        Note[],
  metrics:      SwimMetric[],
  rate:         number | null,
  eta:          string | null,
  spw:          number,
  trend:        Trend,
): string {
  const timesStr = swimTimes.slice(-8).map(t => `  ${t.date}: ${t.time_seconds}s`).join('\n')

  const sessStr = [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
    .map(s => `  ${s.date}: ${s.day_type} (dif. ${s.difficulty}/10)`).join('\n')

  const progStr = [...progressions]
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)
    .map(p => `  ${p.date}: ${p.exercise} — ${p.load_kg}kg`).join('\n')

  const notesStr = [...notes]
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
    .map(n => `  [${n.type}] ${n.date}: ${n.content}`).join('\n')

  const latest      = swimTimes.length ? swimTimes[swimTimes.length - 1].time_seconds : null
  const best        = swimTimes.length ? Math.min(...swimTimes.map(t => t.time_seconds)) : null
  const improvement = (latest && best) ? START_TIME - best : 0

  // Technical metrics (most recent + history)
  const latestMetric = metrics[0] ?? null
  const techCurrent = latestMetric ? `
Data: ${latestMetric.date}
  [Empurrão da parede]
    Dolphin kicks        : ${latestMetric.dolphin_kicks_wall     ?? 'N/A'} (ideal: 5–7)
    Distância subaquát.  : ${latestMetric.underwater_dist_wall_m ?? 'N/A'} m (ideal: 7–10m)
    Kicks / 10m          : ${latestMetric.dolphin_kicks_10m      ?? 'N/A'} (ideal: 5–8, corpo parado sem impulso, menos = mais potência)
    Braçadas (c/ pernas) : ${latestMetric.stroke_count_wall      ?? 'N/A'} (ideal para 196cm: 13–17)
    Braçadas (só braçada): ${latestMetric.stroke_count_arms_only ?? 'N/A'} (força da braçada isolada)
  ${latestMetric.notes ? `Notas: ${latestMetric.notes}` : ''}`.trim() : '  (sem dados técnicos registados ainda)'

  const techHistory = metrics.slice(1, 4).map(m =>
    `  ${m.date}: parede(kicks=${m.dolphin_kicks_wall ?? '?'}, sub=${m.underwater_dist_wall_m ?? '?'}m, kicks10m=${m.dolphin_kicks_10m ?? '?'}, braç=${m.stroke_count_wall ?? '?'}, braçSóBraço=${m.stroke_count_arms_only ?? '?'})`
  ).join('\n')

  return `Sou o André, 22 anos, 196cm, 93kg. Objetivo: 25m freestyle em 12.00s.

--- PERFORMANCE ---
Tempo inicial: ${START_TIME}s | Melhor: ${best ?? 'N/A'}s | Último: ${latest ?? 'N/A'}s
Melhoria total: ${improvement > 0 ? `-${improvement.toFixed(2)}s` : '0s'}
Taxa: ${rate ? `${Math.abs(rate).toFixed(3)}s/semana ${rate < 0 ? '(a melhorar)' : '(a piorar)'}` : 'N/A'}
ETA 12s: ${eta ?? 'não calculável'} | Treinos/sem: ${spw} | Tendência: ${trend}

--- ÚLTIMOS TEMPOS ---
${timesStr || '(sem registos)'}

--- DADOS TÉCNICOS (mais recente) ---
${techCurrent}

--- HISTÓRICO TÉCNICO ---
${techHistory || '  (sem histórico adicional)'}

--- TREINOS RECENTES ---
${sessStr || '(sem registos)'}

--- PROGRESSÕES DE FORÇA ---
${progStr || '(sem registos)'}

--- NOTAS ---
${notesStr || '(sem notas)'}

Analisa o meu perfil técnico e de performance. Responde com:
1. **Nível técnico atual** — onde estou comparado com o objetivo de 12s? O que os dados técnicos revelam?
2. **Ponto crítico #1** — qual a maior limitação técnica com base nos dados (dolphin kicks, underwater, eficiência de kicks/10m, braçadas)?
3. **Plano desta semana** — 2-3 ações concretas e específicas (ex: "nos próximos treinos foca X sessions a fazer Y")
4. **O que está bem** — o que devo continuar a fazer

Sê direto, técnico e específico. Usa os números reais. Máximo 320 palavras. Português de Portugal.`
}

// ─── Trend styles ─────────────────────────────────────────────────────────────

const TREND_STYLE: Record<Trend, { label: string; pill: string }> = {
  improving:    { label: 'A melhorar',         pill: 'bg-green-400/10 border-green-400/20 text-green-400'  },
  plateau:      { label: 'Plateau',             pill: 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400' },
  regressing:   { label: 'A regredir',          pill: 'bg-red-400/10 border-red-400/20 text-red-400'   },
  insufficient: { label: 'Dados insuficientes', pill: 'bg-gray-400/10 border-gray-400/20 text-gray-400' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Treinador() {
  const [swimTimes,    setSwimTimes]    = useState<SwimTime[]>([])
  const [sessions,     setSessions]     = useState<Session[]>([])
  const [progressions, setProgressions] = useState<Progression[]>([])
  const [notes,        setNotes]        = useState<Note[]>([])
  const [techMetrics,  setTechMetrics]  = useState<SwimMetric[]>([])
  const [swimMetrics,  setSwimMetrics]  = useState<SwimMetricRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [analyzing,    setAnalyzing]    = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [advice,       setAdvice]       = useState<string | null>(null)
  const [aiError,      setAiError]      = useState<string | null>(null)
  const [form,         setForm]         = useState<MetricForm>(emptyForm)
  const [formOpen,     setFormOpen]     = useState(false)
  const [saveMsg,      setSaveMsg]      = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('swim_times').select('*').order('date'),
      supabase.from('workout_sessions').select('*').order('date'),
      supabase.from('progressions').select('*').order('date'),
      supabase.from('notes').select('*').order('date'),
      supabase.from('swim_metrics').select('*').order('date', { ascending: false }).limit(10),
      supabase.from('swim_metrics')
        .select('date, dolphin_kicks_wall, underwater_dist_wall_m, dolphin_kicks_10m, stroke_count_wall, stroke_count_arms_only')
        .order('date', { ascending: true }),
    ]).then(([t, s, p, n, m, chart]) => {
      setSwimTimes(t.data ?? [])
      setSessions(s.data ?? [])
      setProgressions(p.data ?? [])
      setNotes(n.data ?? [])
      setTechMetrics(m.data ?? [])
      setSwimMetrics(chart.data as SwimMetricRow[] ?? [])
      setLoading(false)
    })
  }, [])

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const sorted      = [...swimTimes].sort((a, b) => a.date.localeCompare(b.date))
  const latestTime  = sorted.length ? sorted[sorted.length - 1].time_seconds : null
  const bestTime    = sorted.length ? Math.min(...sorted.map(t => t.time_seconds)) : null
  const firstTime   = sorted.length ? sorted[0].time_seconds : START_TIME
  const improvement = latestTime ? firstTime - latestTime : 0
  const rate        = weeklyRate(sorted)
  const eta         = etaFromRate(sorted, rate)
  const spw         = avgSessionsPerWeek(sessions)
  const trend       = trendStatus(sorted)
  const progress    = latestTime ? Math.min(100, ((START_TIME - latestTime) / (START_TIME - GOAL)) * 100) : 0
  const gapToGoal   = latestTime ? latestTime - GOAL : null

  // ── Save technical metric ────────────────────────────────────────────────────
  async function saveMetric(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    const row = {
      date:                    form.date,
      dolphin_kicks_wall:      form.dolphin_kicks_wall     ? parseInt(form.dolphin_kicks_wall)       : null,
      underwater_dist_wall_m:  form.underwater_dist_wall_m ? parseFloat(form.underwater_dist_wall_m) : null,
      dolphin_kicks_10m:       form.dolphin_kicks_10m      ? parseInt(form.dolphin_kicks_10m)        : null,
      stroke_count_wall:       form.stroke_count_wall      ? parseInt(form.stroke_count_wall)        : null,
      stroke_count_arms_only:  form.stroke_count_arms_only ? parseInt(form.stroke_count_arms_only)   : null,
      notes:                   form.notes.trim() || null,
    }
    const { data, error } = await supabase.from('swim_metrics').insert(row).select().single()
    if (error) {
      setSaveMsg('Erro ao guardar: ' + error.message)
    } else {
      setTechMetrics(prev => [data as SwimMetric, ...prev])
      setForm(emptyForm())
      setFormOpen(false)
      setSaveMsg('Dados técnicos guardados!')
      setTimeout(() => setSaveMsg(null), 3000)
    }
    setSaving(false)
  }

  function setField(key: keyof MetricForm, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  // ── Groq analysis ────────────────────────────────────────────────────────────
  async function analyse() {
    const key = import.meta.env.VITE_GROQ_API_KEY
    if (!key) { setAiError('Adiciona VITE_GROQ_API_KEY ao .env e reinicia o servidor.'); return }
    setAnalyzing(true)
    setAiError(null)
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role:    'system',
              content: 'És um treinador especializado em natação de velocidade (25m/50m freestyle) e preparação física. Analisas dados reais e técnicos e dás conselhos práticos, diretos e personalizados. Respondes sempre em português de Portugal.',
            },
            {
              role:    'user',
              content: buildPrompt(sorted, sessions, progressions, notes, techMetrics, rate, eta, spw, trend),
            },
          ],
          temperature: 0.65,
          max_tokens:  650,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { choices: { message: { content: string } }[] }
      setAdvice(data.choices[0].message.content)
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 text-sm">A carregar dados...</div>
  )

  const ts = TREND_STYLE[trend]
  const latestMetric = techMetrics[0] ?? null

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Treinador IA</h1>
        <p className="text-gray-400 text-sm mt-1">Análise técnica + performance · objetivo 12.00s</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Último tempo</p>
          <p className="text-2xl font-bold text-white font-mono">{latestTime != null ? `${latestTime}s` : '—'}</p>
          {gapToGoal != null && <p className="text-cyan-400 text-xs mt-1">faltam {gapToGoal.toFixed(2)}s</p>}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Melhoria total</p>
          <p className="text-2xl font-bold text-white font-mono">
            {improvement > 0 ? `-${improvement.toFixed(2)}s` : '—'}
          </p>
          <p className="text-gray-500 text-xs mt-1">desde o início</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Ritmo/semana</p>
          <p className="text-2xl font-bold text-white font-mono">
            {rate ? `${Math.abs(rate).toFixed(3)}s` : '—'}
          </p>
          <p className={`text-xs mt-1 ${rate && rate < 0 ? 'text-green-400' : rate ? 'text-red-400' : 'text-gray-500'}`}>
            {rate ? (rate < 0 ? 'a melhorar' : 'a piorar') : 'sem dados'}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">ETA 12.00s</p>
          <p className="text-base font-bold text-white leading-tight mt-1">{eta ?? '—'}</p>
          <p className="text-gray-500 text-xs mt-1">estimativa linear</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-semibold">Progresso para o objetivo</p>
            <p className="text-gray-500 text-xs">{START_TIME}s → 12.00s · melhor: {bestTime ?? '—'}s</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${ts.pill}`}>{ts.label}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-700"
            style={{ width: `${Math.max(1, progress)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-gray-600 text-xs">{START_TIME}s</span>
          <span className="text-cyan-400 text-xs font-semibold">{progress.toFixed(1)}%</span>
          <span className="text-gray-600 text-xs">12.00s</span>
        </div>
      </div>

      {/* ── TECHNICAL METRICS ──────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

        {/* Section header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Análise Técnica</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Regista as métricas após cada sessão — o coach usa-as para adaptar o treino
            </p>
          </div>
          <button
            onClick={() => setFormOpen(v => !v)}
            className="shrink-0 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            {formOpen ? 'Fechar' : '+ Registar'}
          </button>
        </div>

        {/* Latest snapshot */}
        {latestMetric && !formOpen && (
          <div className="px-5 py-4 border-b border-gray-800/60 space-y-4">
            <p className="text-gray-600 text-xs">
              Última medição · {new Date(latestMetric.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            {GROUPS.map(g => {
              const vals = g.items.map(item => ({ ...item, val: latestMetric[item.key] }))
              if (vals.every(v => v.val == null)) return null
              return (
                <div key={g.id}>
                  <p className="text-gray-600 text-xs font-medium mb-2">{g.label}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {vals.map(m => (
                      <div key={m.key} className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-lg mb-1">{m.icon}</p>
                        <p className="text-white font-mono font-bold text-base leading-none">
                          {m.val != null ? `${m.val}` : '—'}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5 leading-tight">{m.unit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Form */}
        {formOpen && (
          <form onSubmit={saveMetric} className="p-5 space-y-5">

            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5">Data da sessão</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setField('date', e.target.value)}
                required
                className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {GROUPS.map(g => (
              <div key={g.id} className="space-y-3">
                <div>
                  <p className="text-white text-sm font-semibold">{g.label}</p>
                  <p className="text-gray-600 text-xs">{g.desc}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {g.items.map(m => (
                    <div key={m.key} className="bg-gray-800/40 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{m.icon}</span>
                        <div>
                          <p className="text-white text-sm font-medium">{m.label}</p>
                          <span className="text-cyan-400/70 text-xs">Ideal: {m.ideal}</span>
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs mb-3 leading-relaxed">{m.tip}</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={m.step}
                          min={m.min}
                          max={m.max}
                          placeholder="—"
                          value={form[m.key]}
                          onChange={e => setField(m.key, e.target.value)}
                          className="w-28 bg-gray-800 border border-gray-700 text-white font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                        <span className="text-gray-500 text-xs">{m.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5">
                Notas da sessão <span className="text-gray-600">(opcional)</span>
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="Como te sentiste? O que correu bem ou mal?"
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 resize-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-semibold text-sm rounded-lg px-5 py-2.5 transition-colors cursor-pointer"
              >
                {saving ? 'A guardar...' : 'Guardar métricas'}
              </button>
              <button
                type="button"
                onClick={() => { setForm(emptyForm()); setFormOpen(false) }}
                className="text-gray-500 hover:text-white text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>

          </form>
        )}

        {saveMsg && (
          <div className="px-5 py-3 bg-green-500/10 border-t border-green-500/20 text-green-400 text-sm">
            {saveMsg}
          </div>
        )}

        {/* History table */}
        {techMetrics.length > 1 && (
          <div className="px-5 py-4">
            <p className="text-gray-600 text-xs font-medium mb-3">Histórico</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-96">
                <thead>
                  <tr className="text-gray-600 border-b border-gray-800">
                    <th className="text-left pb-2 font-medium pr-3">Data</th>
                  </tr>
                  <tr className="text-gray-700 border-b border-gray-800/50">
                    <th className="pb-1.5" />
                    <th className="text-center pb-1.5 font-normal">🐬 kicks</th>
                    <th className="text-center pb-1.5 font-normal">📏 m</th>
                    <th className="text-center pb-1.5 font-normal">🐬/10m</th>
                    <th className="text-center pb-1.5 font-normal">🤿 braç.</th>
                    <th className="text-center pb-1.5 font-normal">💪 braç.</th>
                  </tr>
                </thead>
                <tbody>
                  {techMetrics.slice(0, 6).map((m, i) => (
                    <tr key={m.id} className={`border-b border-gray-800/50 ${i === 0 ? 'text-white' : 'text-gray-400'}`}>
                      <td className="py-2 pr-3">
                        {new Date(m.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                      </td>
                      <td className="text-center py-2 font-mono">{m.dolphin_kicks_wall     ?? '—'}</td>
                      <td className="text-center py-2 font-mono">{m.underwater_dist_wall_m ?? '—'}</td>
                      <td className="text-center py-2 font-mono">{m.dolphin_kicks_10m      ?? '—'}</td>
                      <td className="text-center py-2 font-mono">{m.stroke_count_wall      ?? '—'}</td>
                      <td className="text-center py-2 font-mono">{m.stroke_count_arms_only ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!latestMetric && !formOpen && (
          <div className="px-5 py-8 text-center">
            <p className="text-gray-600 text-sm">Sem dados técnicos ainda.</p>
            <p className="text-gray-700 text-xs mt-1">
              Regista as métricas após a próxima sessão para análise personalizada.
            </p>
          </div>
        )}
      </div>

      {/* ── Métricas Técnicas ──────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-white font-semibold">Evolução das Métricas Técnicas</h2>
          <p className="text-gray-500 text-xs mt-0.5">Empurrão da parede · progressão ao longo do tempo</p>
        </div>
        {swimMetrics.length < 2 ? (
          <div className="flex items-center justify-center text-gray-600 text-sm py-10">
            {swimMetrics.length === 0
              ? 'Regista métricas técnicas acima para ver a evolução'
              : 'Falta 1 sessão para ver os gráficos'}
          </div>
        ) : (() => {
          const techScoreData = swimMetrics.map(m => {
            const scores = TECH_METRICS
              .map(({ key }) => m[key] != null ? metricScore(key, m[key] as number) : null)
              .filter((s): s is number => s !== null)
            const avg = scores.length > 0
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : null
            return { date: m.date.slice(5), score: avg }
          }).filter(p => p.score !== null) as { date: string; score: number }[]

          const latestScore = techScoreData.at(-1)?.score ?? null
          const firstScore  = techScoreData[0]?.score ?? null
          const scoreDelta  = latestScore !== null && firstScore !== null ? latestScore - firstScore : null

          return (
          <div className="space-y-5">
            {/* Índice geral */}
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white text-sm font-semibold">Índice Técnico Geral</p>
                  <p className="text-gray-600 text-xs mt-0.5">Média normalizada das 5 métricas · 0 = mau · 100 = ideal</p>
                </div>
                {latestScore !== null && (
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-cyan-400 font-mono font-bold text-2xl leading-none">{latestScore}</p>
                    <p className="text-gray-500 text-xs mt-0.5">/ 100</p>
                    {scoreDelta !== null && scoreDelta !== 0 && (
                      <p className={`text-xs mt-1 font-medium ${scoreDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {scoreDelta > 0 ? '+' : ''}{scoreDelta} pts
                      </p>
                    )}
                  </div>
                )}
              </div>
              {techScoreData.length >= 2 && (
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={techScoreData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111827" />
                    <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#4b5563', fontSize: 10 }} width={28} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip {...tooltipStyle} formatter={(v: unknown) => [`${v} / 100`, 'Índice Técnico']} />
                    <Line
                      type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2.5}
                      dot={{ fill: '#22d3ee', r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#67e8f9' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Mini-charts individuais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TECH_METRICS.map(({ key, label, unit, color, desc }) => {
              const pts = swimMetrics
                .filter(m => m[key] != null)
                .map(m => ({ date: m.date.slice(5), value: m[key] as number }))
              if (pts.length < 2) return (
                <div key={key} className="bg-gray-800/30 border border-gray-800 rounded-xl p-4">
                  <p className="text-gray-400 text-xs font-medium mb-0.5">{label}</p>
                  <p className="text-gray-600 text-xs">Sem dados suficientes</p>
                </div>
              )
              const latest         = pts.at(-1)!.value
              const delta          = latest - pts[0].value
              const higherIsBetter = TECH_SCORING[key]?.higherIsBetter ?? false
              const improved       = higherIsBetter ? delta > 0 : delta < 0
              return (
                <div key={key} className="bg-gray-800/30 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-gray-300 text-xs font-medium">{label}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{desc}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="font-mono font-bold text-sm leading-none" style={{ color }}>
                        {latest} {unit}
                      </p>
                      {delta !== 0 && (
                        <p className={`text-xs mt-0.5 ${improved ? 'text-green-400' : 'text-red-400'}`}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(key === 'underwater_dist_wall_m' ? 1 : 0)}
                        </p>
                      )}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={110}>
                    <LineChart data={pts} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#111827" />
                      <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis
                        domain={[(d: number) => Math.floor(d * 0.9), (d: number) => Math.ceil(d * 1.08)]}
                        tick={{ fill: '#4b5563', fontSize: 10 }}
                        width={32}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(v: unknown) => [`${v} ${unit}`, label]}
                      />
                      <Line
                        type="monotone" dataKey="value" stroke={color} strokeWidth={2}
                        dot={{ fill: color, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            })}
          </div>
          </div>
          )
        })()}
      </div>

      {/* AI Coach */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-white font-semibold">Recomendação do Treinador</h2>
          <p className="text-gray-500 text-xs mt-1">
            {latestMetric
              ? 'Usa os teus dados técnicos, tempos, força e treinos para dar uma recomendação concreta.'
              : 'Regista métricas técnicas acima para uma análise mais precisa.'}
          </p>
        </div>

        {aiError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {aiError}
          </div>
        )}

        {advice && (
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
            <p className="text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">Análise</p>
            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{advice}</div>
          </div>
        )}

        <button
          onClick={analyse}
          disabled={analyzing}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-semibold rounded-lg px-4 py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <>
              <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              A analisar...
            </>
          ) : advice ? 'Atualizar análise' : 'Analisar com IA'}
        </button>

        <p className="text-gray-700 text-xs text-center">Powered by Groq · llama-3.3-70b · grátis</p>
      </div>

    </div>
  )
}
