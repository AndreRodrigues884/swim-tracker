import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Diff = 'easy' | 'medium' | 'hard'
type Tab = 'core' | 'mobilidade'

const D: Record<Diff, { label: string; short: string; cls: string }> = {
  easy:   { label: 'Fácil',   short: 'F', cls: 'bg-green-500/20  text-green-400  border-green-500/30' },
  medium: { label: 'Médio',   short: 'M', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  hard:   { label: 'Difícil', short: 'D', cls: 'bg-red-500/20    text-red-400    border-red-500/30' },
}

const TO_STATUS: Record<Diff, 'done' | 'skipped' | 'failed'> = {
  easy: 'done', medium: 'skipped', hard: 'failed',
}

interface Ex { id: string; name: string; sets: number; reps: string; has_weight: boolean }

const CORE_EX: Ex[] = [
  { id: 'along-antebr', name: 'Alongamento antebraço',       sets: 3, reps: '30s', has_weight: false },
  { id: 'along-pe',     name: 'Alongamento peito do pé',     sets: 3, reps: '40s', has_weight: false },
  { id: 'rolling-hbr',  name: 'Rolling Hollow Body Rocks',   sets: 3, reps: '10',  has_weight: false },
  { id: 'rot-ombro',    name: 'Rotações externas ombro',     sets: 4, reps: '15',  has_weight: true  },
  { id: 'hollow',       name: 'Hollow body hold',            sets: 4, reps: '35s', has_weight: false },
  { id: 'obliquos',     name: 'Oblíquos com halter',         sets: 3, reps: '15',  has_weight: true  },
  { id: 'prancha',      name: 'Prancha',                     sets: 3, reps: '1min', has_weight: false },
  { id: 'ab-crunch',    name: 'Ab crunchs no banco',         sets: 3, reps: '15',  has_weight: true  },
]

const MOB_EX: Ex[] = [
  { id: 'sleeper',      name: 'Sleeper stretch',             sets: 2, reps: '40s cada lado', has_weight: false },
  { id: 'wall-rot',     name: 'Wall rotation',               sets: 3, reps: '10',            has_weight: false },
  { id: '90-90',        name: '90/90 ancas',                 sets: 2, reps: '40s cada lado', has_weight: false },
  { id: 'theraband',    name: 'Theraband rot. externas',     sets: 3, reps: '15',            has_weight: false },
  { id: 'arm-circles',  name: 'Rotações de braço',           sets: 2, reps: '15',            has_weight: false },
  { id: 'cadeia-post',  name: 'Mobilidade cadeia posterior', sets: 1, reps: '5min',          has_weight: false },
]

export default function Core() {
  const [tab, setTab]             = useState<Tab>('core')
  const [sets, setSets]           = useState<Record<string, Diff>>({})
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const exercises = tab === 'core' ? CORE_EX : MOB_EX
  const totalSets = exercises.reduce((s, e) => s + e.sets, 0)
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
        day_type: tab,
        difficulty: 5,
      })
      .select()
      .single()

    if (sErr || !session) {
      setError(sErr?.message ?? 'Erro ao guardar')
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
      await supabase.from('set_logs').insert(logs)
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
          <h1 className="text-2xl font-bold text-white">Core & Mobilidade</h1>
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

      {/* Tabs */}
      <div className="flex gap-2">
        {(['core', 'mobilidade'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSets({}) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
              tab === t
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            {t === 'core' ? 'Core' : 'Mobilidade'}
            <span className="ml-2 text-xs opacity-50">
              {t === 'core' ? 'Qua + Qui' : 'Diária · 15min'}
            </span>
          </button>
        ))}
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {exercises.map(ex => {
          const keys      = Array.from({ length: ex.sets }, (_, i) => `${ex.id}|||${i}`)
          const doneCount = keys.filter(k => sets[k]).length
          return (
            <div key={ex.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-medium">{ex.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {ex.sets} séries × {ex.reps}
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
