import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'

interface SwimTime {
  id: string
  date: string
  time_seconds: number
  location: string | null
  created_at: string
}

const GOAL = 12.00

export default function Natacao() {
  const [times, setTimes] = useState<SwimTime[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time_seconds: '',
    location: '',
  })

  useEffect(() => { fetchTimes() }, [])

  async function fetchTimes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('swim_times')
      .select('*')
      .order('date', { ascending: true })
    if (error) setError(error.message)
    else setTimes(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await supabase.from('swim_times').insert({
      date: form.date,
      time_seconds: parseFloat(form.time_seconds),
      location: form.location.trim() || null,
    })
    if (error) {
      setError(error.message)
    } else {
      setForm(f => ({ ...f, time_seconds: '', location: '' }))
      await fetchTimes()
    }
    setSubmitting(false)
  }

  // Sorted ascending for chart + delta calculation
  const asc = [...times].sort((a, b) => a.date.localeCompare(b.date))
  // Sorted descending for history table
  const desc = [...asc].reverse()

  const bestTime = times.length > 0 ? Math.min(...times.map(t => t.time_seconds)) : null
  const firstTime = asc.length > 0 ? asc[0].time_seconds : null
  const latestTime = asc.length > 0 ? asc[asc.length - 1].time_seconds : null
  const improvement = firstTime !== null && latestTime !== null ? firstTime - latestTime : null

  const chartData = asc.map(t => ({ date: t.date.slice(5), time: t.time_seconds }))

  const yMin = times.length > 0
    ? Math.min(GOAL - 0.4, Math.min(...times.map(t => t.time_seconds)) - 0.3)
    : 11
  const yMax = times.length > 0
    ? Math.max(...times.map(t => t.time_seconds)) + 0.5
    : 15

  // delta: current - previous chronological session
  const historyWithDelta = desc.map((t, i) => {
    const prevInAsc = asc[asc.length - 1 - i - 1]
    const delta = prevInAsc ? t.time_seconds - prevInAsc.time_seconds : null
    return { ...t, delta }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Natação</h1>
        <p className="text-gray-400 text-sm mt-1">50m Freestyle · Objetivo: entrar na faixa dos 12s</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Melhor tempo"
          value={bestTime !== null ? `${bestTime.toFixed(2)}s` : '—'}
          sub={
            bestTime !== null
              ? `${((bestTime - GOAL) / GOAL * 100).toFixed(1)}% acima do objetivo`
              : 'Sem registos ainda'
          }
          valueClass="text-cyan-400"
        />
        <MetricCard
          label="Objetivo"
          value="12.00s"
          sub="50m freestyle · faixa dos 12s"
          valueClass="text-white"
        />
        <MetricCard
          label="Melhoria total"
          value={improvement !== null ? `−${improvement.toFixed(2)}s` : '—'}
          sub={
            improvement !== null && firstTime !== null
              ? `desde o primeiro registo (${firstTime.toFixed(2)}s)`
              : 'Precisas de mais registos'
          }
          valueClass={improvement !== null && improvement > 0 ? 'text-green-400' : 'text-gray-400'}
        />
      </div>

      {/* Form + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Registar tempo</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Data">
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </Field>
            <Field label="Tempo (segundos)">
              <input
                type="number"
                step="0.01"
                min="10"
                max="30"
                placeholder="ex: 13.90"
                value={form.time_seconds}
                onChange={e => setForm(f => ({ ...f, time_seconds: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </Field>
            <Field label="Local (opcional)">
              <input
                type="text"
                placeholder="ex: Piscina Municipal"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </Field>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer"
            >
              {submitting ? 'A guardar…' : 'Guardar tempo'}
            </button>
          </form>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-1">Evolução 25m Freestyle</h2>
          <p className="text-gray-500 text-xs mb-4">
            Linha vermelha = objetivo 12.00s
          </p>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-600 text-sm">
              Adiciona o primeiro registo para ver o gráfico
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={v => `${(v as number).toFixed(1)}s`}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(v: unknown) => [`${(v as number).toFixed(2)}s`, 'Tempo']}
                />
                <ReferenceLine
                  y={GOAL}
                  stroke="#ef4444"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{
                    value: '12.00s',
                    fill: '#ef4444',
                    fontSize: 11,
                    position: 'insideTopRight',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={{ fill: '#22d3ee', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#22d3ee' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Histórico</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">A carregar…</p>
        ) : historyWithDelta.length === 0 ? (
          <p className="text-gray-500 text-sm">Sem registos ainda. Adiciona o teu primeiro tempo acima.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 text-left">
                  <th className="pb-3 pr-6 font-medium">Data</th>
                  <th className="pb-3 pr-6 font-medium">Tempo</th>
                  <th className="pb-3 pr-6 font-medium">Local</th>
                  <th className="pb-3 font-medium">Δ vs anterior</th>
                </tr>
              </thead>
              <tbody>
                {historyWithDelta.map(t => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 pr-6 text-gray-300">{t.date}</td>
                    <td className="py-3 pr-6">
                      <span
                        className={`font-mono font-semibold ${
                          t.time_seconds === bestTime ? 'text-cyan-400' : 'text-white'
                        }`}
                      >
                        {t.time_seconds.toFixed(2)}s
                      </span>
                      {t.time_seconds === bestTime && (
                        <span className="ml-2 text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded px-1.5 py-0.5">
                          PB
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-6 text-gray-400">{t.location ?? '—'}</td>
                    <td className="py-3">
                      {t.delta === null ? (
                        <span className="text-gray-600 text-xs">primeiro registo</span>
                      ) : t.delta < 0 ? (
                        <span className="text-green-400 font-mono">▼ {Math.abs(t.delta).toFixed(2)}s</span>
                      ) : t.delta > 0 ? (
                        <span className="text-red-400 font-mono">▲ {t.delta.toFixed(2)}s</span>
                      ) : (
                        <span className="text-gray-500 font-mono">= 0.00s</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string
  value: string
  sub: string
  valueClass: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-3xl font-bold font-mono mt-1 ${valueClass}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-1.5">{sub}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-gray-400 text-sm block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
