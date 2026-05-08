import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'

interface SwimTime    { date: string; time_seconds: number }
interface Progression { id: string; date: string; exercise: string; load_kg: number }

const SUGGESTED_EXERCISES = [
  'Pull-ups c/peso', 'Dips c/peso', 'Chin-ups c/peso',
  'Press militar', 'Arnold press', 'Elevações laterais',
  'Agachamento', 'Romanian Deadlift', 'Bulgarian split squat',
  'Barbell curl', 'Skull crushers', 'Remadas com halter',
]

export default function Estatisticas() {
  const [swimTimes, setSwimTimes]       = useState<SwimTime[]>([])
  const [progressions, setProgressions] = useState<Progression[]>([])
  const [selectedEx, setSelectedEx]     = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [form, setForm]                 = useState({
    date:     new Date().toISOString().split('T')[0],
    exercise: '',
    load_kg:  '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('swim_times').select('date, time_seconds').order('date'),
      supabase.from('progressions').select('*').order('date'),
    ]).then(([swim, prog]) => {
      if (swim.data) setSwimTimes(swim.data)
      if (prog.data) {
        setProgressions(prog.data)
        if (prog.data.length > 0) setSelectedEx(prog.data[0].exercise)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.exercise.trim() || !form.load_kg) return
    setError(null)
    setSubmitting(true)

    const { data, error: err } = await supabase
      .from('progressions')
      .insert({ date: form.date, exercise: form.exercise.trim(), load_kg: parseFloat(form.load_kg) })
      .select()
      .single()

    if (err) {
      setError(err.message)
    } else if (data) {
      const updated = [...progressions, data].sort((a, b) => a.date.localeCompare(b.date))
      setProgressions(updated)
      setSelectedEx(data.exercise)
      setForm(f => ({ ...f, load_kg: '' }))
    }
    setSubmitting(false)
  }

  // Unique exercises recorded
  const exercises = [...new Set(progressions.map(p => p.exercise))]

  const swimChartData = swimTimes.map(t => ({ date: t.date.slice(5), time: t.time_seconds }))

  const progChartData = progressions
    .filter(p => p.exercise === selectedEx)
    .map(p => ({ date: p.date.slice(5), load: p.load_kg }))

  const latestLoad = progChartData.at(-1)?.load ?? null
  const firstLoad  = progChartData.at(0)?.load  ?? null
  const loadGain   = firstLoad !== null && latestLoad !== null ? latestLoad - firstLoad : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Estatísticas</h1>
        <p className="text-gray-400 text-sm mt-1">Evolução de tempos e cargas</p>
      </div>

      {/* Swim times chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-1">Evolução 50m Freestyle</h2>
        <p className="text-gray-500 text-xs mb-4">Linha vermelha = objetivo 12.00s</p>
        {swimChartData.length === 0 ? (
          <div className="flex items-center justify-center h-44 text-gray-600 text-sm">
            Sem registos de natação ainda
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={swimChartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis
                domain={[
                  (dMin: number) => Math.min(11.5, dMin - 0.3),
                  (dMax: number) => dMax + 0.4,
                ]}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={v => `${(v as number).toFixed(1)}s`}
                width={44}
              />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v: unknown) => [`${(v as number).toFixed(2)}s`, 'Tempo']}
              />
              <ReferenceLine
                y={12}
                stroke="#ef4444"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{ value: '12.00s', fill: '#ef4444', fontSize: 11, position: 'insideTopRight' }}
              />
              <Line
                type="monotone"
                dataKey="time"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={{ fill: '#22d3ee', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Load progressions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add progression */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Registar progressão</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Exercício</label>
              <input
                list="ex-list"
                placeholder="Escolhe ou escreve…"
                value={form.exercise}
                onChange={e => setForm(f => ({ ...f, exercise: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
              <datalist id="ex-list">
                {SUGGESTED_EXERCISES.map(ex => <option key={ex} value={ex} />)}
              </datalist>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Carga (kg)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="ex: 10.0"
                value={form.load_kg}
                onChange={e => setForm(f => ({ ...f, load_kg: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer"
            >
              {submitting ? 'A guardar…' : 'Guardar progressão'}
            </button>
          </form>
        </div>

        {/* Load chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 className="text-white font-semibold">Evolução de carga</h2>
              {loadGain !== null && (
                <p className={`text-xs mt-1 ${loadGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {loadGain >= 0 ? '+' : ''}{loadGain.toFixed(1)}kg desde o início
                  {latestLoad !== null && (
                    <span className="text-gray-500 ml-2">· atual: {latestLoad}kg</span>
                  )}
                </p>
              )}
            </div>
            {exercises.length > 0 && (
              <select
                value={selectedEx}
                onChange={e => setSelectedEx(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                {exercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            )}
          </div>
          {progChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
              {exercises.length === 0
                ? 'Adiciona a primeira progressão para ver o gráfico'
                : 'Sem dados para este exercício'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={progChartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis
                  domain={[
                    (dMin: number) => Math.max(0, dMin - 2),
                    (dMax: number) => dMax + 2,
                  ]}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={v => `${v}kg`}
                  width={50}
                />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(v: unknown) => [`${v}kg`, 'Carga']}
                />
                <Line
                  type="monotone"
                  dataKey="load"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={{ fill: '#a78bfa', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
