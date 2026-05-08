import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Diff = 'easy' | 'medium' | 'hard'

const D: Record<Diff, { label: string; short: string; cls: string }> = {
  easy:   { label: 'Fácil',   short: 'F', cls: 'bg-green-500/20  text-green-400  border-green-500/30' },
  medium: { label: 'Médio',   short: 'M', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  hard:   { label: 'Difícil', short: 'D', cls: 'bg-red-500/20    text-red-400    border-red-500/30' },
}

const TO_STATUS: Record<Diff, 'done' | 'skipped' | 'failed'> = {
  easy: 'done', medium: 'skipped', hard: 'failed',
}

interface Ex { id: string; name: string; sets: number; reps: string }
interface WDay { key: string; label: string; days: string; exercises: Ex[] }

const WORKOUTS: WDay[] = [
  {
    key: 'costas-peito', label: 'Costas & Peito', days: 'Ter / Sáb',
    exercises: [
      { id: 'pu-w',   name: 'Pull-ups c/peso',       sets: 6, reps: '5'  },
      { id: 'dips-w', name: 'Dips c/peso',            sets: 6, reps: '5'  },
      { id: 'pu-n',   name: 'Pull-ups normais',       sets: 4, reps: '10' },
      { id: 'cu-w',   name: 'Chin-ups c/peso',        sets: 3, reps: '8'  },
      { id: 'dips-n', name: 'Dips normais',            sets: 4, reps: '12' },
      { id: 'rows',   name: 'Remadas com halter',     sets: 5, reps: '10' },
    ],
  },
  {
    key: 'ombros', label: 'Ombros & Core', days: 'Qua',
    exercises: [
      { id: 'press-m', name: 'Press militar',         sets: 6, reps: '5'  },
      { id: 'arnold',  name: 'Arnold press',           sets: 4, reps: '10' },
      { id: 'lat-r',   name: 'Elevações laterais',    sets: 4, reps: '15' },
      { id: 'upright', name: 'Upright rows',           sets: 3, reps: '12' },
      { id: 'fpulls',  name: 'Face pulls',             sets: 4, reps: '15' },
      { id: 'ext-r',   name: 'Rotações externas',     sets: 4, reps: '15' },
    ],
  },
  {
    key: 'pernas', label: 'Pernas & Potência', days: 'Qui',
    exercises: [
      { id: 'squat',  name: 'Agachamento',             sets: 6, reps: '5'  },
      { id: 'rdl',    name: 'Romanian Deadlift',        sets: 5, reps: '8'  },
      { id: 'vjump',  name: 'Saltos verticais',         sets: 6, reps: '5'  },
      { id: 'bulg',   name: 'Bulgarian split squat',   sets: 4, reps: '10' },
      { id: 'lunges', name: 'Lunges',                   sets: 3, reps: '12' },
      { id: 'calfs',  name: 'Calf raises',              sets: 4, reps: '20' },
    ],
  },
  {
    key: 'bic-tri', label: 'Bíceps & Triceps', days: 'Sex',
    exercises: [
      { id: 'bb-curl', name: 'Barbell curl',           sets: 4, reps: '10' },
      { id: 'hammer',  name: 'Curl martelo',            sets: 4, reps: '12' },
      { id: 'conc',    name: 'Curl concentrado',        sets: 3, reps: '10' },
      { id: 'skull',   name: 'Skull crushers',          sets: 4, reps: '10' },
      { id: 'tri-ext', name: 'Tricep extensions',       sets: 4, reps: '12' },
      { id: 'kick',    name: 'Kickbacks',               sets: 3, reps: '12' },
    ],
  },
]

// JS getDay(): 0=Dom,1=Seg,2=Ter,3=Qua,4=Qui,5=Sex,6=Sáb → workout idx
const DAY_MAP: Record<number, number> = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 0 }
const defaultIdx = DAY_MAP[new Date().getDay()] ?? 0

export default function Treino() {
  const [activeIdx, setActiveIdx]     = useState(defaultIdx)
  const [sets, setSets]               = useState<Record<string, Diff>>({})
  const [sessionDiff, setSessionDiff] = useState(5)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const workout   = WORKOUTS[activeIdx]
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets, 0)
  const doneSets  = Object.keys(sets).length

  function cycleSet(key: string) {
    setSets(prev => {
      const cur = prev[key]
      if (!cur)             return { ...prev, [key]: 'easy' }
      if (cur === 'easy')   return { ...prev, [key]: 'medium' }
      if (cur === 'medium') return { ...prev, [key]: 'hard' }
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function saveSession() {
    setSaving(true)
    setError(null)

    const { data: session, error: sErr } = await supabase
      .from('workout_sessions')
      .insert({
        date: new Date().toISOString().split('T')[0],
        day_type: workout.key,
        difficulty: sessionDiff,
      })
      .select()
      .single()

    if (sErr || !session) {
      setError(sErr?.message ?? 'Erro ao guardar sessão')
      setSaving(false)
      return
    }

    if (doneSets > 0) {
      const logs = Object.entries(sets).map(([key, diff]) => {
        const sep = key.lastIndexOf('|||')
        return {
          session_id:  session.id,
          exercise_id: key.slice(0, sep),
          set_number:  parseInt(key.slice(sep + 3)) + 1,
          status:      TO_STATUS[diff],
        }
      })
      const { error: lErr } = await supabase.from('set_logs').insert(logs)
      if (lErr) { setError(lErr.message); setSaving(false); return }
    }

    setSets({})
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
          <p className="text-gray-400 text-sm mt-1">
            {doneSets}/{totalSets} séries marcadas
          </p>
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
            onClick={() => { setActiveIdx(i); setSets({}) }}
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
          const doneCount = keys.filter(k => sets[k]).length
          return (
            <div key={ex.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-medium">{ex.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {ex.sets} séries × {ex.reps} reps
                  </p>
                </div>
                <span className="text-gray-600 text-xs font-mono">{doneCount}/{ex.sets}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {keys.map((key, i) => {
                  const s = sets[key]
                  return (
                    <button
                      key={key}
                      onClick={() => cycleSet(key)}
                      className={`w-10 h-10 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        s
                          ? D[s].cls
                          : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {s ? D[s].short : i + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-4 text-xs text-gray-600 flex-wrap">
        <span>Clica para marcar:</span>
        <span className="text-green-400">F = Fácil</span>
        <span className="text-yellow-400">M = Médio</span>
        <span className="text-red-400">D = Difícil</span>
        <span>· clica novamente para apagar</span>
      </div>
    </div>
  )
}
