import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Ex, Diff } from '../interfaces/workout'

const D: Record<Diff, { label: string; short: string; cls: string }> = {
  easy: { label: 'Fácil', short: 'F', cls: 'bg-green-500/20  text-green-400  border-green-500/30' },
  medium: { label: 'Médio', short: 'M', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  hard: { label: 'Difícil', short: 'D', cls: 'bg-red-500/20    text-red-400    border-red-500/30' },
}

const TO_STATUS: Record<Diff, 'done' | 'skipped' | 'failed'> = {
  easy: 'done', medium: 'skipped', hard: 'failed',
}

const CORE_EX: Ex[] = [
  { id: 'along-antebr', name: 'Alongamento antebraço', sets: 3, reps: '30s', has_weight: false },
  { id: 'along-pe', name: 'Alongamento peito do pé', sets: 3, reps: '30s', has_weight: false },
  { id: 'rot-ombro', name: 'Rotações externas ombro', sets: 4, reps: '20', has_weight: false },
  { id: 'rolling-hbr', name: 'Rolling Hollow Body Rocks', sets: 3, reps: '15', has_weight: false },
  { id: 'hollow', name: 'Hollow body hold', sets: 4, reps: '50s', has_weight: true },
  { id: 'ab-roller-wheel', name: 'AB Roller Wheel', sets: 3, reps: '8', has_weight: false },
  { id: 'ab-crunch', name: 'Ab crunchs no banco', sets: 3, reps: '20', has_weight: true },
  { id: 'obliquos', name: 'Oblíquos com halter', sets: 3, reps: '20', has_weight: true },
]

export default function Core() {
  const [sets, setSets] = useState<Record<string, Diff>>({})
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSets = CORE_EX.reduce((s, e) => s + e.sets, 0)
  const doneSets = Object.keys(sets).length

  function cycleSet(key: string) {
    setSets(prev => {
      const cur = prev[key]
      if (!cur) return { ...prev, [key]: 'easy' }
      if (cur === 'easy') return { ...prev, [key]: 'medium' }
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
        day_type: 'core',
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
          session_id: session.id,
          exercise_id: key.slice(0, sep),
          set_number: parseInt(key.slice(sep + 3)) + 1,
          status: TO_STATUS[diff],
        }
      })
      await supabase.from('set_logs').insert(logs)
    }

    const today = new Date().toISOString().split('T')[0]
    const progressions = CORE_EX
      .filter(ex => ex.has_weight && weights[ex.id] && parseFloat(weights[ex.id]) > 0)
      .map(ex => ({ date: today, exercise: ex.name, load_kg: parseFloat(weights[ex.id]) }))
    if (progressions.length > 0) {
      await supabase.from('progressions').insert(progressions)
    }

    setSets({})
    setWeights({})
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Core</h1>
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

      {/* Exercises */}
      <div className="space-y-3">
        {CORE_EX.map(ex => {
          const keys = Array.from({ length: ex.sets }, (_, i) => `${ex.id}|||${i}`)
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
                <div className="flex items-center gap-3">
                  {ex.has_weight && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="0"
                        value={weights[ex.id] ?? ''}
                        onChange={e => setWeights(prev => ({ ...prev, [ex.id]: e.target.value }))}
                        className="w-16 bg-gray-800 border border-gray-700 text-white font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500 transition-colors text-center"
                      />
                      <span className="text-gray-500 text-xs">kg</span>
                    </div>
                  )}
                  <span className="text-gray-600 text-xs font-mono">{doneCount}/{ex.sets}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {keys.map((key, i) => {
                  const s = sets[key]
                  return (
                    <button
                      key={key}
                      onClick={() => cycleSet(key)}
                      className={`w-10 h-10 rounded-lg border text-xs font-bold transition-all cursor-pointer ${s
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
