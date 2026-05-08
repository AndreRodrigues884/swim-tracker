import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { supabase } from '../lib/supabase'

interface SwimTime    { date: string; time_seconds: number }
interface Progression { date: string; exercise: string; load_kg: number }
interface Session     { date: string }

// Returns the Monday of the week for a given YYYY-MM-DD date
function getMondayKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD — used for sorting
}

export default function Estatisticas() {
  const [swimTimes,    setSwimTimes]    = useState<SwimTime[]>([])
  const [progressions, setProgressions] = useState<Progression[]>([])
  const [sessions,     setSessions]     = useState<Session[]>([])
  const [selectedEx,   setSelectedEx]   = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('swim_times').select('date, time_seconds').order('date'),
      supabase.from('progressions').select('date, exercise, load_kg').order('date'),
      supabase.from('workout_sessions').select('date').order('date'),
    ]).then(([swim, prog, sess]) => {
      if (swim.data) setSwimTimes(swim.data)
      if (prog.data) {
        setProgressions(prog.data)
        if (prog.data.length > 0) setSelectedEx(prog.data[0].exercise)
      }
      if (sess.data) setSessions(sess.data)
    })
  }, [])

  // Unique exercises with data (sorted A→Z)
  const exercises = [...new Set(progressions.map(p => p.exercise))].sort()

  // Swim chart
  const swimChartData = swimTimes.map(t => ({ date: t.date.slice(5), time: t.time_seconds }))

  // Load chart for selected exercise
  const progChartData = progressions
    .filter(p => p.exercise === selectedEx)
    .map(p => ({ date: p.date.slice(5), load: p.load_kg }))

  const firstLoad  = progChartData.at(0)?.load  ?? null
  const latestLoad = progChartData.at(-1)?.load ?? null
  const loadGain   = firstLoad !== null && latestLoad !== null ? latestLoad - firstLoad : null

  // Sessions per week
  const weekMap: Record<string, number> = {}
  for (const s of sessions) {
    const key = getMondayKey(s.date)
    weekMap[key] = (weekMap[key] ?? 0) + 1
  }
  const weekChartData = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ week: key.slice(5), count })) // show MM-DD

  const avgPerWeek = weekChartData.length > 0
    ? (weekChartData.reduce((s, w) => s + w.count, 0) / weekChartData.length).toFixed(1)
    : null

  const tooltipStyle = {
    contentStyle: { background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: '#9ca3af' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Estatísticas</h1>
        <p className="text-gray-400 text-sm mt-1">Evolução de tempos, cargas e consistência</p>
      </div>

      {/* ── Swim times ───────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-1">Evolução 50m Freestyle</h2>
        <p className="text-gray-500 text-xs mb-4">Linha vermelha = objetivo 12.00s</p>
        {swimChartData.length === 0 ? (
          <Empty label="Sem registos de natação ainda" h={44} />
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
                {...tooltipStyle}
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

      {/* ── Load progression ─────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <h2 className="text-white font-semibold">Evolução de carga</h2>
          {exercises.length > 0 && (
            <select
              value={selectedEx}
              onChange={e => setSelectedEx(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500 max-w-xs"
            >
              {exercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          )}
        </div>

        {/* Stats row */}
        {progChartData.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCard label="Carga inicial" value={`${firstLoad}kg`} />
            <StatCard label="Carga atual"   value={`${latestLoad}kg`} accent />
            <StatCard
              label="Ganho total"
              value={loadGain !== null ? `${loadGain >= 0 ? '+' : ''}${loadGain.toFixed(1)}kg` : '—'}
              positive={loadGain !== null && loadGain > 0}
            />
          </div>
        )}

        {progChartData.length === 0 ? (
          <Empty
            h={48}
            label={
              exercises.length === 0
                ? 'As progressões são guardadas automaticamente ao terminar um treino'
                : 'Sem dados para este exercício'
            }
          />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
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
                {...tooltipStyle}
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

      {/* ── Sessions per week ────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <h2 className="text-white font-semibold">Treinos por semana</h2>
          {avgPerWeek && (
            <span className="text-gray-400 text-sm">
              Média: <span className="text-white font-semibold">{avgPerWeek}</span> sessões/semana
            </span>
          )}
        </div>
        <p className="text-gray-500 text-xs mb-4">Segunda-feira = início de semana</p>
        {weekChartData.length === 0 ? (
          <Empty label="Sem sessões registadas ainda" h={36} />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekChartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                width={24}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: unknown) => [`${v}`, 'Sessões']}
              />
              <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label, value, accent, positive,
}: {
  label: string; value: string; accent?: boolean; positive?: boolean
}) {
  const cls = accent ? 'text-cyan-400' : positive ? 'text-green-400' : 'text-white'
  return (
    <div className="bg-gray-800/60 rounded-lg p-3">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`font-mono font-semibold ${cls}`}>{value}</p>
    </div>
  )
}

function Empty({ label, h }: { label: string; h: number }) {
  return (
    <div
      className="flex items-center justify-center text-gray-600 text-sm text-center px-4"
      style={{ height: `${h * 4}px` }}
    >
      {label}
    </div>
  )
}
