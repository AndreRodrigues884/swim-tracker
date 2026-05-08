import { useState, useEffect } from 'react'
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

interface Ex   { id: string; name: string; sets: number; reps: string; has_weight: boolean }
interface WDay { key: string; label: string; days: string; exercises: Ex[] }

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
      { id: 'squat',   name: 'Agachamento curl bar',     sets: 6, reps: '5',  has_weight: true  },
      { id: 'rdl',     name: 'Romanian deadlift curl bar', sets: 5, reps: '8', has_weight: true },
      { id: 'bjump',   name: 'Broad jump',               sets: 6, reps: '5',  has_weight: false },
      { id: 'bulg',    name: 'Bulgarian split squat',    sets: 4, reps: '10', has_weight: true  },
      { id: 'calfs',   name: 'Calf raises curl bar',     sets: 4, reps: '20', has_weight: true  },
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
  },
]

const DAY_MAP: Record<number, number> = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 0 }
const defaultIdx = DAY_MAP[new Date().getDay()] ?? 0

export default function Treino() {
  const [activeIdx,    setActiveIdx]    = useState(defaultIdx)
  const [setData,      setSetData]      = useState<Record<string, SetEntry>>({})
  const [expandedKey,  setExpandedKey]  = useState<string | null>(null)
  const [draft,        setDraft]        = useState<Partial<SetEntry>>({})
  const [sessionDiff,  setSessionDiff]  = useState(5)
  const [lastWeights,  setLastWeights]  = useState<Record<string, number | null>>({})
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const workout   = WORKOUTS[activeIdx]
  const doneSets  = Object.keys(setData).length
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets, 0)

  // Fetch last recorded weight for each exercise in the current workout
  useEffect(() => {
    const names = workout.exercises.map(e => e.name)
    const init: Record<string, number | null> = {}
    workout.exercises.forEach(e => { init[e.id] = null })
    setLastWeights(init)

    supabase
      .from('progressions')
      .select('exercise, load_kg, date')
      .in('exercise', names)
      .order('date', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        const map = { ...init }
        for (const row of data) {
          const ex = workout.exercises.find(e => e.name === row.exercise)
          if (ex && map[ex.id] === null) map[ex.id] = row.load_kg
        }
        setLastWeights(map)
      })
  }, [activeIdx])

  function openSet(key: string, plannedReps: string) {
    if (expandedKey === key) { setExpandedKey(null); return }
    const existing = setData[key]
    setDraft(
      existing
        ? { ...existing }
        : { diff: 'easy', weight: '', reps: plannedReps, execType: 'continuous' }
    )
    setExpandedKey(key)
  }

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
      .insert({ date: today, day_type: workout.key, difficulty: sessionDiff })
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

      {/* Session difficulty */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <span className="text-gray-400 text-sm shrink-0">Dificuldade da sessão:</span>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(d => (
            <button
              key={d}
              onClick={() => setSessionDiff(d)}
              className={`w-7 h-7 rounded text-xs font-bold border transition-colors cursor-pointer ${
                d === sessionDiff
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                  : d < sessionDiff
                  ? 'bg-cyan-500/5 text-cyan-800 border-gray-700'
                  : 'bg-gray-800 text-gray-600 border-gray-700 hover:text-gray-400'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <span className="text-gray-500 text-xs">
          {sessionDiff <= 3 ? 'Fácil' : sessionDiff <= 6 ? 'Moderado' : sessionDiff <= 8 ? 'Difícil' : 'Extremo'}
        </span>
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {workout.exercises.map(ex => {
          const keys      = Array.from({ length: ex.sets }, (_, i) => `${ex.id}|||${i}`)
          const doneCount = keys.filter(k => setData[k]).length
          const lastW     = lastWeights[ex.id]
          const formKey   = expandedKey && keys.includes(expandedKey) ? expandedKey : null
          const formSetIdx = formKey ? parseInt(formKey.split('|||')[1]) + 1 : null

          return (
            <div key={ex.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              {/* Exercise header */}
              <div className="flex items-start justify-between mb-1">
                <p className="text-white font-medium">{ex.name}</p>
                <span className="text-gray-600 text-xs font-mono shrink-0 ml-2">{doneCount}/{ex.sets}</span>
              </div>
              <div className="flex items-center gap-2 mb-3 text-xs">
                <span className="text-gray-500">{ex.sets} × {ex.reps} reps</span>
                <span className="text-gray-700">·</span>
                <span className={lastW !== null ? 'text-cyan-700' : 'text-gray-700'}>
                  {lastW !== null ? `Última vez: ${lastW}kg` : 'Sem registo'}
                </span>
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
                      onClick={() => openSet(key, ex.reps)}
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
                  <p className="text-gray-500 text-xs mb-3 font-medium">
                    Série {formSetIdx}
                  </p>

                  {/* Weight + Reps */}
                  <div className="flex gap-3 mb-3">
                    {ex.has_weight && (
                      <div className="flex-1">
                        <label className="text-gray-500 text-xs block mb-1">Peso (kg) — opcional</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="—"
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
                        placeholder={ex.reps}
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
