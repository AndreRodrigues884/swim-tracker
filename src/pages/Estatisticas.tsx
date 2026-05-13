import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { supabase } from '../lib/supabase'

interface SwimTime  { date: string; time_seconds: number }
interface WSession  { id: string; date: string; day_type: string }
interface WeightLog { date: string; weight_kg: number }
interface SetLog    { exercise_id: string; weight_kg: number; reps_done: number; session_id: string }
interface Prog      { date: string; exercise: string; load_kg: number }

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

const ORM_EXERCISES = [
  { id: 'pu-w',    label: 'Pull-ups'   },
  { id: 'dips-w',  label: 'Dips'       },
  { id: 'press-m', label: 'Press'      },
  { id: 'squat',   label: 'Agacha.'    },
  { id: 'rdl',     label: 'RDL'        },
  { id: 'hip-thr', label: 'Hip thrust' },
]

const MUSCLE_GROUPS = ['costas-peito', 'ombros', 'pernas', 'bic-tri', 'core'] as const

const MG_LABEL: Record<string, string> = {
  'costas-peito': 'Costas',
  'ombros':       'Ombros',
  'pernas':       'Pernas',
  'bic-tri':      'Braços',
  'core':         'Core',
}
const MG_COLOR: Record<string, string> = {
  'costas-peito': '#22d3ee',
  'ombros':       '#60a5fa',
  'pernas':       '#a78bfa',
  'bic-tri':      '#fb923c',
  'core':         '#4ade80',
}

export default function Estatisticas() {
  const [swimTimes,     setSwimTimes]     = useState<SwimTime[]>([])
  const [sessions,      setSessions]      = useState<WSession[]>([])
  const [weightLogs,    setWeightLogs]    = useState<WeightLog[]>([])
  const [setLogs,       setSetLogs]       = useState<SetLog[]>([])
  const [progData,      setProgData]      = useState<Prog[]>([])
  const [selectedOrmEx, setSelectedOrmEx] = useState('pu-w')

  useEffect(() => {
    const ormIds = ORM_EXERCISES.map(e => e.id)
    Promise.all([
      supabase.from('swim_times').select('date, time_seconds').order('date'),
      supabase.from('workout_sessions').select('id, date, day_type').order('date'),
      supabase.from('weight_logs').select('date, weight_kg').order('date'),
      supabase.from('set_logs')
        .select('exercise_id, weight_kg, reps_done, session_id')
        .in('exercise_id', ormIds)
        .gt('weight_kg', 0)
        .gt('reps_done', 0),
      supabase.from('progressions').select('date, exercise, load_kg').order('date'),
    ]).then(([swim, sess, wt, logs, pgrs]) => {
      if (swim.data)  setSwimTimes(swim.data)
      if (sess.data)  setSessions(sess.data)
      if (wt.data)    setWeightLogs(wt.data)
      if (logs.data)  setSetLogs(logs.data as SetLog[])
      if (pgrs.data)  setProgData(pgrs.data)
    })
  }, [])

  // ── Swim chart ─────────────────────────────────────────────────────────
  const swimChartData = swimTimes.map(t => ({ date: t.date.slice(5), time: t.time_seconds }))

  // ── Sessions per week ──────────────────────────────────────────────────
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

  // ── Weight chart ───────────────────────────────────────────────────────
  const weightChartData = weightLogs.map(w => ({ date: w.date.slice(5), kg: w.weight_kg }))
  const firstWeight  = weightChartData.at(0)?.kg  ?? null
  const latestWeight = weightChartData.at(-1)?.kg ?? null
  const weightDelta  = firstWeight !== null && latestWeight !== null ? latestWeight - firstWeight : null

  // ── 1RM (Epley: weight × (1 + reps/30)) ───────────────────────────────
  const sessionDateMap: Record<string, string> = {}
  for (const s of sessions) sessionDateMap[s.id] = s.date

  const ormByExDate: Record<string, Record<string, number>> = {}
  for (const log of setLogs) {
    const date = sessionDateMap[log.session_id]
    if (!date) continue
    const orm = log.weight_kg * (1 + log.reps_done / 30)
    if (!ormByExDate[log.exercise_id]) ormByExDate[log.exercise_id] = {}
    if ((ormByExDate[log.exercise_id][date] ?? 0) < orm)
      ormByExDate[log.exercise_id][date] = orm
  }

  const ormChartData: Record<string, Array<{ date: string; orm: number }>> = {}
  for (const { id } of ORM_EXERCISES) {
    ormChartData[id] = Object.entries(ormByExDate[id] ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({ date: d.slice(5), orm: parseFloat(v.toFixed(1)) }))
  }

  const currentOrmPts = ormChartData[selectedOrmEx] ?? []
  const latestOrm = currentOrmPts.at(-1)?.orm ?? null
  const bestOrm   = currentOrmPts.length > 0 ? Math.max(...currentOrmPts.map(p => p.orm)) : null

  // ── Volume semanal por grupo muscular ──────────────────────────────────
  const volWeekMap: Record<string, Record<string, number>> = {}
  for (const s of sessions) {
    const week = getMondayKey(s.date)
    if (!volWeekMap[week]) volWeekMap[week] = {}
    volWeekMap[week][s.day_type] = (volWeekMap[week][s.day_type] ?? 0) + 1
  }
  const volumeChartData = Object.entries(volWeekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, types]) => ({ week: week.slice(5), ...types }))

  // ── Deload detection ───────────────────────────────────────────────────
  const progByExDate: Record<string, Record<string, number>> = {}
  for (const p of progData) {
    if (!progByExDate[p.exercise]) progByExDate[p.exercise] = {}
    const cur = progByExDate[p.exercise][p.date] ?? 0
    progByExDate[p.exercise][p.date] = Math.max(cur, p.load_kg)
  }
  const stagnating: string[] = []
  for (const [exercise, dateMap] of Object.entries(progByExDate)) {
    const loads = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
    if (loads.length < 3) continue
    const last3 = loads.slice(-3)
    if (Math.max(...last3) <= last3[0]) stagnating.push(exercise)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Estatísticas</h1>
        <p className="text-gray-400 text-sm mt-1">Força, natação, peso e consistência</p>
      </div>

      {/* ── 1RM Estimado ──────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="mb-3">
          <h2 className="text-white font-semibold">1RM Estimado</h2>
          <p className="text-gray-600 text-xs mt-0.5">Fórmula Epley · peso × (1 + reps/30)</p>
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {ORM_EXERCISES.map(({ id, label }) => {
            const hasData = (ormChartData[id]?.length ?? 0) > 0
            return (
              <button
                key={id}
                onClick={() => { if (hasData) setSelectedOrmEx(id) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedOrmEx === id && hasData
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 cursor-pointer'
                    : hasData
                    ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white cursor-pointer'
                    : 'bg-gray-800/40 text-gray-700 border-gray-800 cursor-default'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        {currentOrmPts.length > 0 && (
          <div className="flex gap-6 mb-4">
            <div>
              <p className="text-gray-600 text-xs">Atual</p>
              <p className="text-amber-400 font-mono font-bold text-lg mt-0.5">
                {latestOrm?.toFixed(1)} kg
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Máximo histórico</p>
              <p className="text-white font-mono font-bold text-lg mt-0.5">
                {bestOrm?.toFixed(1)} kg
              </p>
            </div>
          </div>
        )}
        {currentOrmPts.length < 2 ? (
          <Empty
            label={currentOrmPts.length === 0
              ? 'Regista séries com peso e reps para calcular o 1RM'
              : 'Falta 1 sessão para ver o gráfico'}
            h={36}
          />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={currentOrmPts} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111827" />
              <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[(dMin: number) => Math.floor(dMin * 0.93), (dMax: number) => Math.ceil(dMax * 1.05)]}
                tick={{ fill: '#4b5563', fontSize: 11 }}
                tickFormatter={v => `${v}kg`}
                width={46}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: unknown) => [`${(v as number).toFixed(1)} kg`, '1RM est.']}
              />
              <Line
                type="monotone" dataKey="orm" stroke="#f59e0b" strokeWidth={2.5}
                dot={{ fill: '#f59e0b', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#fcd34d' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Volume Semanal ────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="mb-1">
          <h2 className="text-white font-semibold">Volume Semanal</h2>
        </div>
        <p className="text-gray-600 text-xs mb-3">Sessões por grupo muscular · últimas 8 semanas</p>
        <div className="flex gap-4 flex-wrap mb-4">
          {MUSCLE_GROUPS.map(mg => (
            <div key={mg} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: MG_COLOR[mg] }} />
              <span className="text-gray-500 text-xs">{MG_LABEL[mg]}</span>
            </div>
          ))}
        </div>
        {volumeChartData.length === 0 ? (
          <Empty label="Sem sessões registadas ainda" h={36} />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={volumeChartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111827" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#4b5563', fontSize: 11 }} width={20} axisLine={false} tickLine={false} />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: unknown, name: unknown) => [`${v}`, MG_LABEL[name as string] ?? String(name)]}
              />
              {MUSCLE_GROUPS.map(mg => (
                <Bar key={mg} dataKey={mg} stackId="a" fill={MG_COLOR[mg]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Deload ────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="mb-3">
          <h2 className="text-white font-semibold">Análise de Deload</h2>
          <p className="text-gray-600 text-xs mt-0.5">Exercícios em plateau há 3+ sessões</p>
        </div>
        {progData.length === 0 ? (
          <Empty label="Sem dados de progressão ainda" h={24} />
        ) : stagnating.length === 0 ? (
          <div className="py-2">
            <p className="text-green-400 text-sm font-medium">Tudo em progressão</p>
            <p className="text-gray-600 text-xs mt-0.5">Nenhum exercício em plateau nas últimas 3 sessões</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-amber-400 text-sm font-medium mb-2">
              {stagnating.length} exercício{stagnating.length !== 1 ? 's' : ''} em plateau — considera uma semana de deload
            </p>
            {stagnating.map(ex => (
              <div key={ex} className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2.5">
                <span className="text-amber-500 text-xs shrink-0">⚠</span>
                <span className="text-gray-300 text-sm">{ex}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Swim times ────────────────────────────────────────────────── */}
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
                y={12} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5}
                label={{ value: '12.00s', fill: '#ef4444', fontSize: 11, position: 'insideTopRight' }}
              />
              <Line
                type="monotone" dataKey="time" stroke="#22d3ee" strokeWidth={2.5}
                dot={{ fill: '#22d3ee', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#67e8f9' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Weight ────────────────────────────────────────────────────── */}
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
                type="monotone" dataKey="kg" stroke="#a78bfa" strokeWidth={2.5}
                dot={{ fill: '#a78bfa', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#c4b5fd' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Sessions per week ─────────────────────────────────────────── */}
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
