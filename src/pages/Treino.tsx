import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { supabase } from '../lib/supabase'

type Diff     = 'easy' | 'medium' | 'hard'
type ExecType = 'continuous' | 'mini_pause' | 'rest_pause'

interface SetEntry {
  diff:     Diff
  weight:   string   // empty = bodyweight / sem peso
  reps:     string
  execType: ExecType
}

const D_CFG: Record<Diff, { label: string; cls: string }> = {
  easy:   { label: 'Fácil',   cls: 'bg-green-500/20  text-green-400  border-green-500/30'  },
  medium: { label: 'Médio',   cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  hard:   { label: 'Difícil', cls: 'bg-red-500/20    text-red-400    border-red-500/30'    },
}

const TO_STATUS: Record<Diff, 'done' | 'skipped' | 'failed'> = {
  easy: 'done', medium: 'skipped', hard: 'failed',
}

const EXEC_OPTS: { value: ExecType; label: string }[] = [
  { value: 'continuous', label: 'Seguidas'   },
  { value: 'mini_pause', label: 'Mini-pausa' },
  { value: 'rest_pause', label: 'Rest-pause' },
]

interface Ex           { id: string; name: string; sets: number; reps: string; has_weight: boolean }
interface ChartGroup   { label: string; exerciseIds: string[] }
interface GroupedChart { label: string; pts: ChartPt[] }
interface WDay         { key: string; label: string; days: string; exercises: Ex[]; chartGroups?: ChartGroup[] }
interface LastEntry    { weight: string | null; reps: string | null }
interface ChartPt      { date: string; vol: number }

const WORKOUTS: WDay[] = [
  {
    key: 'costas-peito', label: 'Costas & Peito', days: 'Ter / Sáb',
    exercises: [
      { id: 'pu-w',    name: 'Pull-ups com peso',       sets: 6, reps: '5',  has_weight: true  },
      { id: 'pu-n',    name: 'Pull-ups normais',         sets: 4, reps: '10', has_weight: true  },
      { id: 'cu-w',    name: 'Chin-ups com peso',        sets: 3, reps: '8',  has_weight: true  },
      { id: 'dips-w',  name: 'Dips com peso',            sets: 6, reps: '5',  has_weight: true  },
      { id: 'dips-n',  name: 'Dips normais',              sets: 4, reps: '12', has_weight: true  },
    ],
    chartGroups: [
      { label: 'Costas', exerciseIds: ['pu-w', 'pu-n', 'cu-w']  },
      { label: 'Dips',   exerciseIds: ['dips-w', 'dips-n']      },
    ],
  },
  {
    key: 'ombros', label: 'Ombros', days: 'Qua',
    exercises: [
      { id: 'press-m', name: 'Press militar curl bar',   sets: 6, reps: '5',  has_weight: true  },
      { id: 'arnold',  name: 'Arnold press',              sets: 4, reps: '10', has_weight: true  },
      { id: 'lat-r',   name: 'Elevações laterais',       sets: 4, reps: '15', has_weight: true  },
      { id: 'upright', name: 'Upright rows curl bar',    sets: 3, reps: '12', has_weight: true  },
    ],
  },
  {
    key: 'pernas', label: 'Pernas & Potência', days: 'Qui',
    exercises: [
      { id: 'squat',   name: 'Agachamento curl bar',     sets: 5, reps: '5',  has_weight: true  },
      { id: 'rdl',     name: 'Romanian deadlift curl bar', sets: 5, reps: '8', has_weight: true },
      { id: 'bjump',   name: 'Broad jump',               sets: 5, reps: '5',  has_weight: false },
      { id: 'calfs',   name: 'Calf raises curl bar',     sets: 4, reps: '20', has_weight: true  },
      { id: 'hip-thr', name: 'Hip thrust',               sets: 3, reps: '15', has_weight: true  },
    ],
  },
  {
    key: 'bic-tri', label: 'Bíceps & Tríceps', days: 'Sex',
    exercises: [
      { id: 'bb-curl',  name: 'Barbell curl curl bar',   sets: 4, reps: '10', has_weight: true  },
      { id: 'hammer',   name: 'Curl martelo',             sets: 4, reps: '12', has_weight: true  },
      { id: 'conc',     name: 'Curl concentrado',         sets: 3, reps: '10', has_weight: true  },
      { id: 'skull',    name: 'Skull crushers curl bar',  sets: 4, reps: '10', has_weight: true  },
      { id: 'tri-ext',  name: 'Tricep extensions curl bar', sets: 4, reps: '12', has_weight: true },
      { id: 'kick',     name: 'Tricep kickbacks',         sets: 3, reps: '12', has_weight: true  },
      { id: 'wrist',    name: 'Wrist curls curl bar',     sets: 4, reps: '15', has_weight: true  },
      { id: 'rev-wrist',name: 'Reverse wrist curls',      sets: 3, reps: '15', has_weight: true  },
    ],
    chartGroups: [
      { label: 'Bíceps',  exerciseIds: ['bb-curl', 'hammer', 'conc']  },
      { label: 'Tríceps', exerciseIds: ['skull', 'tri-ext', 'kick']   },
    ],
  },
]

const DAY_MAP: Record<number, number> = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 0 }
const defaultIdx = DAY_MAP[new Date().getDay()] ?? 0

export default function Treino() {
  const [activeIdx,    setActiveIdx]    = useState(defaultIdx)
  const [setData,      setSetData]      = useState<Record<string, SetEntry>>({})
  const [expandedKey,  setExpandedKey]  = useState<string | null>(null)
  const [draft,        setDraft]        = useState<Partial<SetEntry>>({})
  const [lastSetData,  setLastSetData]  = useState<Record<string, LastEntry>>({})
  const [chartGroups,  setChartGroups]  = useState<GroupedChart[]>([])
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const workout   = WORKOUTS[activeIdx]
  const doneSets  = Object.keys(setData).length
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets, 0)

  // Fetch last weight (from progressions) + last reps (from most recent session's set_logs)
  useEffect(() => {
    setLastSetData({})
    const exIds = workout.exercises.map(e => e.id)

    async function load() {
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('day_type', workout.key)
        .order('date', { ascending: false })
        .limit(1)

      if (!sessions?.length) return

      const { data: logs } = await supabase
        .from('set_logs')
        .select('exercise_id, set_number, weight_kg, reps_done')
        .eq('session_id', sessions[0].id)

      if (!logs) return

      const map: Record<string, LastEntry> = {}
      for (const log of logs) {
        if (!exIds.includes(log.exercise_id)) continue
        // key matches the app's format: exerciseId|||setIndex (0-based)
        const key = `${log.exercise_id}|||${log.set_number - 1}`
        map[key] = {
          weight: log.weight_kg != null ? String(log.weight_kg) : null,
          reps:   log.reps_done  != null ? String(log.reps_done)  : null,
        }
      }
      setLastSetData(map)
    }

    load()
  }, [activeIdx])

  function openSet(key: string) {
    if (expandedKey === key) { setExpandedKey(null); return }
    const existing = setData[key]
    setDraft(
      existing
        ? { ...existing }
        : { diff: 'easy', weight: '', reps: '', execType: 'continuous' }
    )
    setExpandedKey(key)
  }

  useEffect(() => {
    const groups: ChartGroup[] = workout.chartGroups
      ?? [{ label: workout.label, exerciseIds: workout.exercises.filter(e => e.has_weight).map(e => e.id) }]
    setChartGroups(groups.map(g => ({ label: g.label, pts: [] })))

    async function loadChart() {
      const allExIds = groups.flatMap(g => g.exerciseIds)
      if (!allExIds.length) return

      const [{ data: sessions }, { data: logs }] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('id, date')
          .eq('day_type', workout.key)
          .order('date', { ascending: true }),
        supabase
          .from('set_logs')
          .select('exercise_id, weight_kg, reps_done, session_id')
          .in('exercise_id', allExIds)
          .gt('weight_kg', 0)
          .gt('reps_done', 0),
      ])

      if (!sessions?.length || !logs?.length) return

      const sesMap: Record<string, string> = {}
      for (const s of sessions) sesMap[s.id] = s.date

      setChartGroups(groups.map(g => {
        const groupExIds = new Set(g.exerciseIds)
        const dateMap: Record<string, number> = {}
        for (const log of logs) {
          if (!groupExIds.has(log.exercise_id)) continue
          const date = sesMap[log.session_id]
          if (!date) continue
          dateMap[date] = (dateMap[date] ?? 0) + (log.weight_kg ?? 0) * (log.reps_done ?? 0)
        }
        const pts = Object.entries(dateMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-20)
          .map(([d, total]) => ({
            date: new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
            vol:  Math.round(total),
          }))
        return { label: g.label, pts }
      }))
    }
    loadChart()
  }, [activeIdx])

  function confirmSet(key: string) {
    if (!draft.diff) return
    setSetData(prev => ({
      ...prev,
      [key]: {
        diff:     draft.diff!,
        weight:   draft.weight   ?? '',
        reps:     draft.reps     ?? '',
        execType: draft.execType ?? 'continuous',
      },
    }))
    setExpandedKey(null)
  }

  async function saveSession() {
    setSaving(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]

    const { data: session, error: sErr } = await supabase
      .from('workout_sessions')
      .insert({ date: today, day_type: workout.key, difficulty: 5 })
      .select()
      .single()

    if (sErr || !session) {
      setError(sErr?.message ?? 'Erro ao guardar sessão')
      setSaving(false)
      return
    }

    // set_logs
    if (doneSets > 0) {
      const logs = Object.entries(setData).map(([key, entry]) => {
        const sep = key.lastIndexOf('|||')
        return {
          session_id:     session.id,
          exercise_id:    key.slice(0, sep),
          set_number:     parseInt(key.slice(sep + 3)) + 1,
          status:         TO_STATUS[entry.diff],
          reps_done:      entry.reps   ? parseInt(entry.reps)       : null,
          weight_kg:      entry.weight ? parseFloat(entry.weight)   : null,
          execution_type: entry.execType,
        }
      })
      const { error: lErr } = await supabase.from('set_logs').insert(logs)
      if (lErr) { setError(lErr.message); setSaving(false); return }
    }

    // Auto-save progressions — max weight per exercise this session
    const progInserts: { date: string; exercise: string; load_kg: number }[] = []
    for (const ex of workout.exercises) {
      const weights = Object.entries(setData)
        .filter(([k]) => k.startsWith(`${ex.id}|||`))
        .map(([, e]) => parseFloat(e.weight))
        .filter(w => !isNaN(w) && w > 0)
      if (weights.length > 0)
        progInserts.push({ date: today, exercise: ex.name, load_kg: Math.max(...weights) })
    }
    if (progInserts.length > 0)
      await supabase.from('progressions').insert(progInserts)

    setSetData({})
    setExpandedKey(null)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Treino</h1>
          <p className="text-gray-400 text-sm mt-1">{doneSets}/{totalSets} séries registadas</p>
        </div>
        <button
          onClick={saveSession}
          disabled={saving || doneSets === 0}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-gray-950 font-semibold rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer"
        >
          {saving ? 'A guardar…' : saved ? '✓ Guardado!' : 'Guardar sessão'}
        </button>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 flex-wrap">
        {WORKOUTS.map((w, i) => (
          <button
            key={w.key}
            onClick={() => { setActiveIdx(i); setSetData({}); setExpandedKey(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
              activeIdx === i
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            {w.label}
            <span className="ml-2 text-xs opacity-50">{w.days}</span>
          </button>
        ))}
      </div>

      {/* Progress charts — one per group */}
      <div className="space-y-3">
        {chartGroups.map(({ label, pts }) => {
          if (pts.length < 2) return (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="1,12 5,7 8,9 12,4 15,6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">Progresso — {label}</p>
                <p className="text-gray-600 text-xs mt-0.5">
                  {pts.length === 0
                    ? 'Regista peso e reps em cada série para ver a evolução'
                    : 'Falta 1 sessão para ver o gráfico'}
                </p>
              </div>
            </div>
          )
          const vols   = pts.map(p => p.vol)
          const minVol = Math.min(...vols)
          const maxVol = Math.max(...vols)
          const delta  = vols[vols.length - 1] - vols[vols.length - 2]
          const trend  = delta > 0 ? { label: '↑ A subir', cls: 'text-green-400' }
                       : delta < 0 ? { label: '↓ A descer', cls: 'text-red-400' }
                       :             { label: '→ Estável',  cls: 'text-yellow-400' }
          return (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white text-sm font-semibold">Progresso — {label}</p>
                  <p className="text-gray-600 text-xs mt-0.5">Volume por sessão (kg × reps) · {pts.length} sessões</p>
                </div>
                <span className={`text-xs font-semibold ${trend.cls}`}>{trend.label}</span>
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={pts} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={42}
                    domain={[Math.floor(minVol * 0.9), Math.ceil(maxVol * 1.05)]}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                  />
                  <ReferenceLine y={vols[vols.length - 1]} stroke="#22d3ee" strokeDasharray="4 3" strokeOpacity={0.25} />
                  <Tooltip
                    contentStyle={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#6b7280' }}
                    formatter={(v) => [`${Number(v).toLocaleString('pt-PT')} kg·reps`, 'Volume']}
                  />
                  <Line type="monotone" dataKey="vol" stroke="#22d3ee" strokeWidth={2}
                    dot={{ fill: '#22d3ee', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )
        })}
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {workout.exercises.map(ex => {
          const keys      = Array.from({ length: ex.sets }, (_, i) => `${ex.id}|||${i}`)
          const doneCount = keys.filter(k => setData[k]).length
          const formKey    = expandedKey && keys.includes(expandedKey) ? expandedKey : null
          const formSetIdx = formKey ? parseInt(formKey.split('|||')[1]) + 1 : null
          const lastForSet = formKey ? lastSetData[formKey] : null

          return (
            <div key={ex.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              {/* Exercise header */}
              <div className="flex items-start justify-between mb-1">
                <p className="text-white font-medium">{ex.name}</p>
                <span className="text-gray-600 text-xs font-mono shrink-0 ml-2">{doneCount}/{ex.sets}</span>
              </div>
              <div className="flex items-center gap-2 mb-3 text-xs">
                <span className="text-gray-500">{ex.sets} × {ex.reps} reps</span>
              </div>

              {/* Set buttons */}
              <div className="flex gap-2 flex-wrap">
                {keys.map((key, i) => {
                  const entry  = setData[key]
                  const isOpen = expandedKey === key
                  const btnLabel = entry
                    ? entry.weight ? `${entry.weight}kg` : '✓'
                    : `${i + 1}`

                  return (
                    <button
                      key={key}
                      onClick={() => openSet(key)}
                      className={`h-10 px-2.5 min-w-10 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        isOpen
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 ring-1 ring-cyan-500/20'
                          : entry
                          ? D_CFG[entry.diff].cls
                          : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {btnLabel}
                    </button>
                  )
                })}
              </div>

              {/* Inline form — expands below the set row */}
              {formKey && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-gray-500 text-xs font-medium">Série {formSetIdx}</p>
                    {lastForSet && (
                      <p className="text-cyan-500 text-xs">
                        Última vez:
                        {lastForSet.weight && ` ${lastForSet.weight}kg`}
                        {lastForSet.weight && lastForSet.reps && ' ·'}
                        {lastForSet.reps && ` ${lastForSet.reps} reps`}
                      </p>
                    )}
                  </div>

                  {/* Weight + Reps */}
                  <div className="flex gap-3 mb-3">
                    {ex.has_weight && (
                      <div className="flex-1">
                        <label className="text-gray-500 text-xs block mb-1">Peso (kg)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder={lastForSet?.weight ?? '—'}
                          value={draft.weight ?? ''}
                          onChange={e => setDraft(d => ({ ...d, weight: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="text-gray-500 text-xs block mb-1">Reps feitas</label>
                      <input
                        type="number"
                        min="0"
                        placeholder={lastForSet?.reps ?? ex.reps}
                        value={draft.reps ?? ''}
                        onChange={e => setDraft(d => ({ ...d, reps: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Execution type */}
                  <div className="mb-3">
                    <p className="text-gray-500 text-xs mb-1.5">Tipo de execução</p>
                    <div className="flex gap-2">
                      {EXEC_OPTS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, execType: opt.value }))}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                            draft.execType === opt.value
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty + OK */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2 flex-1">
                      {(['easy', 'medium', 'hard'] as Diff[]).map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDraft(prev => ({ ...prev, diff: d }))}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                            draft.diff === d
                              ? D_CFG[d].cls
                              : 'bg-gray-800 text-gray-600 border-gray-700 hover:text-gray-300'
                          }`}
                        >
                          {D_CFG[d].label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => confirmSet(formKey)}
                      disabled={!draft.diff}
                      className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-gray-950 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
