import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { supabase } from '../lib/supabase'

interface SwimTime  { date: string; time_seconds: number }
interface Session   { date: string }
interface WeightLog { date: string; weight_kg: number }

function getMondayKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

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

export default function Estatisticas() {
  const [swimTimes,    setSwimTimes]    = useState<SwimTime[]>([])
  const [sessions,     setSessions]     = useState<Session[]>([])
  const [weightLogs,   setWeightLogs]   = useState<WeightLog[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('swim_times').select('date, time_seconds').order('date'),
      supabase.from('workout_sessions').select('date').order('date'),
      supabase.from('weight_logs').select('date, weight_kg').order('date'),
    ]).then(([swim, sess, wt]) => {
      if (swim.data) setSwimTimes(swim.data)
      if (sess.data) setSessions(sess.data)
      if (wt.data)   setWeightLogs(wt.data)
    })
  }, [])

  const swimChartData = swimTimes.map(t => ({ date: t.date.slice(5), time: t.time_seconds }))

  const weekMap: Record<string, number> = {}
  for (const s of sessions) {
    const key = getMondayKey(s.date)
    weekMap[key] = (weekMap[key] ?? 0) + 1
  }
  const weekChartData = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ week: key.slice(5), count }))

  const avgPerWeek = weekChartData.length > 0
    ? (weekChartData.reduce((s, w) => s + w.count, 0) / weekChartData.length).toFixed(1)
    : null

  const weightChartData = weightLogs.map(w => ({ date: w.date.slice(5), kg: w.weight_kg }))
  const firstWeight  = weightChartData.at(0)?.kg  ?? null
  const latestWeight = weightChartData.at(-1)?.kg ?? null
  const weightDelta  = firstWeight !== null && latestWeight !== null ? latestWeight - firstWeight : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Estatísticas</h1>
        <p className="text-gray-400 text-sm mt-1">Evolução de tempos, cargas, peso e consistência</p>
      </div>

      {/* ── Swim times ─────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="mb-4">
          <h2 className="text-white font-semibold">Evolução 25m Freestyle</h2>
          <p className="text-gray-600 text-xs mt-0.5">Linha vermelha = objetivo 12.00s</p>
        </div>
        {swimChartData.length === 0 ? (
          <Empty label="Sem registos de natação ainda" h={44} />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={swimChartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111827" />
              <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[
                  (dMin: number) => Math.min(11.5, dMin - 0.3),
                  (dMax: number) => dMax + 0.4,
                ]}
                tick={{ fill: '#4b5563', fontSize: 11 }}
                tickFormatter={v => `${(v as number).toFixed(1)}s`}
                width={44}
                axisLine={false}
                tickLine={false}
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
                strokeWidth={2.5}
                dot={{ fill: '#22d3ee', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#67e8f9' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Weight ─────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="text-white font-semibold">Evolução do Peso</h2>
            <p className="text-gray-600 text-xs mt-0.5">Atualiza o peso no Dashboard</p>
          </div>
          {weightChartData.length > 0 && (
            <div className="flex gap-3">
              <StatCard label="Inicial"  value={firstWeight  ? `${firstWeight}kg`  : '—'} />
              <StatCard label="Atual"    value={latestWeight ? `${latestWeight}kg`  : '—'} accent />
              <StatCard
                label="Variação"
                value={weightDelta !== null ? `${weightDelta >= 0 ? '+' : ''}${weightDelta.toFixed(1)}kg` : '—'}
                positive={weightDelta !== null && weightDelta < 0}
              />
            </div>
          )}
        </div>
        {weightChartData.length === 0 ? (
          <Empty label="Sem registos de peso ainda — atualiza no Dashboard" h={36} />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightChartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111827" />
              <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[
                  (dMin: number) => Math.max(50, dMin - 2),
                  (dMax: number) => dMax + 2,
                ]}
                tick={{ fill: '#4b5563', fontSize: 11 }}
                tickFormatter={v => `${v}kg`}
                width={48}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: unknown) => [`${v}kg`, 'Peso']}
              />
              <Line
                type="monotone"
                dataKey="kg"
                stroke="#a78bfa"
                strokeWidth={2.5}
                dot={{ fill: '#a78bfa', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#c4b5fd' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Sessions per week ──────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <h2 className="text-white font-semibold">Treinos por semana</h2>
          {avgPerWeek && (
            <span className="text-gray-500 text-sm">
              Média: <span className="text-white font-semibold">{avgPerWeek}</span> sessões/sem
            </span>
          )}
        </div>
        <p className="text-gray-600 text-xs mb-4">Segunda-feira = início de semana</p>
        {weekChartData.length === 0 ? (
          <Empty label="Sem sessões registadas ainda" h={36} />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekChartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111827" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#4b5563', fontSize: 11 }}
                width={24}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: unknown) => [`${v}`, 'Sessões']}
              />
              <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={48} opacity={0.85} />
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
    <div className="bg-gray-800/60 rounded-xl p-3 min-w-0">
      <p className="text-gray-600 text-xs mb-1 truncate">{label}</p>
      <p className={`font-mono font-semibold text-sm ${cls}`}>{value}</p>
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
