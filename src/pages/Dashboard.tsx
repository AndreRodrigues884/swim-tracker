import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const START = 13.90
const GOAL  = 12.00

const WEEKLY_PLAN = [
  { day: 'Seg', label: 'Natação',        icon: '🏊', route: '/natacao'   },
  { day: 'Ter', label: 'Costas / Peito', icon: '🏋️', route: '/treino'    },
  { day: 'Qua', label: 'Ombros / Core',  icon: '💪', route: '/core'      },
  { day: 'Qui', label: 'Pernas + Nata',  icon: '🦵', route: '/treino'    },
  { day: 'Sex', label: 'Bíceps / Tri',   icon: '💪', route: '/treino'    },
  { day: 'Sáb', label: 'Costas / Peito', icon: '🏋️', route: '/treino'    },
  { day: 'Dom', label: 'Mobilidade',     icon: '🧘', route: '/core'      },
]

const todayIdx = (new Date().getDay() + 6) % 7

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 19) return 'Boa tarde'
  return 'Boa noite'
}

export default function Dashboard() {
  const [bestTime,          setBestTime]          = useState<number | null>(null)
  const [latestTime,        setLatestTime]         = useState<number | null>(null)
  const [sessionsThisMonth, setSessionsThisMonth]  = useState(0)
  const [loading,           setLoading]            = useState(true)

  useEffect(() => {
    const monthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0]

    Promise.all([
      supabase.from('swim_times').select('time_seconds').order('time_seconds', { ascending: true }).limit(1),
      supabase.from('swim_times').select('time_seconds').order('date', { ascending: false }).limit(1),
      supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).gte('date', monthStr),
    ]).then(([best, latest, sessions]) => {
      if (best.data?.[0])   setBestTime(best.data[0].time_seconds)
      if (latest.data?.[0]) setLatestTime(latest.data[0].time_seconds)
      setSessionsThisMonth(sessions.count ?? 0)
      setLoading(false)
    })
  }, [])

  const displayTime = bestTime ?? START
  const progress    = Math.min(100, Math.max(0, ((START - displayTime) / (START - GOAL)) * 100))
  const gap         = displayTime - GOAL
  const improved    = bestTime ? START - bestTime : 0

  const today    = WEEKLY_PLAN[todayIdx]
  const tomorrow = WEEKLY_PLAN[(todayIdx + 1) % 7]

  // SVG ring — use viewBox so it scales with container
  const R    = 44
  const CIRC = 2 * Math.PI * R
  const dash = ((100 - progress) / 100) * CIRC

  return (
    <div className="space-y-5">

      {/* ── HERO ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800/80">
        <div className="absolute inset-0 bg-linear-to-br from-gray-900 via-gray-900 to-gray-950" />
        <div className="absolute inset-0 bg-linear-to-tl from-cyan-950/25 via-transparent to-transparent" />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-radial from-cyan-500/10 to-transparent" />

        <div className="relative p-5 sm:p-6">

          {/* Top row: ring + greeting + (desktop) stats */}
          <div className="flex items-center gap-4 sm:gap-6">

            {/* Ring — explicit size so overlay text positions correctly */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full -rotate-90"
                style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.2))' }}
              >
                <circle cx="50" cy="50" r={R} fill="none" stroke="#0f1f2e" strokeWidth="8" />
                <circle cx="50" cy="50" r={R} fill="none" stroke="#1a3040" strokeWidth="8"
                  strokeDasharray="3 5" />
                <circle
                  cx="50" cy="50" r={R}
                  fill="none"
                  stroke="url(#arcGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={dash}
                  style={{ transition: 'stroke-dashoffset 0.7s ease' }}
                />
                <defs>
                  <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0e7490" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Text centered in ring — NOT rotated */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-cyan-300 font-bold text-lg sm:text-xl font-mono leading-none tabular-nums">
                  {loading ? '—' : displayTime.toFixed(2)}
                </span>
                <span className="text-gray-500 text-xs mt-0.5">seg</span>
              </div>
            </div>

            {/* Greeting + badges */}
            <div className="flex-1 min-w-0">
              <p className="text-gray-500 text-xs sm:text-sm">{greeting()},</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">André</h1>
              <p className="text-gray-600 text-xs mt-0.5">25m freestyle · 196 cm</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-medium">
                  {progress.toFixed(1)}%
                </span>
                {improved > 0 && (
                  <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">
                    −{improved.toFixed(2)}s
                  </span>
                )}
              </div>
            </div>

            {/* Stats — desktop only */}
            <div className="hidden sm:flex sm:flex-col gap-3 text-right shrink-0">
              <div>
                <p className="text-gray-600 text-xs">Objetivo</p>
                <p className="text-white font-mono font-bold">12.00s</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">Faltam</p>
                <p className="text-orange-400 font-mono font-bold">
                  {loading ? '—' : `${gap.toFixed(2)}s`}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">Este mês</p>
                <p className="text-white font-bold">
                  {loading ? '—' : sessionsThisMonth}
                  <span className="text-gray-600 text-xs font-normal ml-1">treinos</span>
                </p>
              </div>
            </div>

          </div>

          {/* Stats — mobile only, below ring row */}
          <div className="grid grid-cols-3 gap-2 mt-4 sm:hidden">
            {[
              { label: 'Objetivo', value: '12.00s',                        color: 'text-white' },
              { label: 'Faltam',   value: loading ? '—' : `${gap.toFixed(2)}s`, color: 'text-orange-400' },
              { label: 'Treinos',  value: loading ? '—' : `${sessionsThisMonth}`, color: 'text-white', sub: 'este mês' },
            ].map(s => (
              <div key={s.label} className="bg-gray-800/50 rounded-xl px-3 py-2.5 text-center">
                <p className="text-gray-600 text-xs mb-0.5">{s.label}</p>
                <p className={`font-mono font-bold text-sm ${s.color}`}>{s.value}</p>
                {s.sub && <p className="text-gray-700 text-xs">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-700 mb-1">
              <span>{START.toFixed(2)}s</span>
              <span className="text-cyan-500/60">{progress.toFixed(1)}%</span>
              <span>12.00s</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-gray-800/80">
              <div
                className="h-full rounded-full bg-linear-to-r from-cyan-800 to-cyan-400 transition-all duration-700"
                style={{ width: `${Math.max(1, progress)}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── CARDS ROW ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Today */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900 to-gray-950">
          <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-cyan-500/30 to-transparent" />
          <div className="p-5">
            <p className="text-gray-600 text-xs font-medium uppercase tracking-wider mb-3">Hoje</p>
            <Link to={today.route} className="flex items-center gap-3 group">
              <span className="text-3xl">{today.icon}</span>
              <div>
                <p className="text-white font-bold text-lg group-hover:text-cyan-400 transition-colors leading-tight">
                  {today.label}
                </p>
                <p className="text-gray-600 text-xs mt-0.5">{today.day} · toca para abrir</p>
              </div>
            </Link>
            <div className="mt-4 pt-4 border-t border-gray-800/60 flex items-center gap-2">
              <span className="text-gray-700 text-xs">Amanhã</span>
              <span>{tomorrow.icon}</span>
              <span className="text-gray-500 text-xs">{tomorrow.label}</span>
            </div>
          </div>
        </div>

        {/* Body stats */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900 to-gray-950">
          <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-violet-500/20 to-transparent" />
          <div className="p-5">
            <p className="text-gray-600 text-xs font-medium uppercase tracking-wider mb-3">Corpo</p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-500 text-sm">Altura</span>
                <span className="text-white font-mono text-sm font-semibold">196 cm</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-gray-500 text-sm">Idade</span>
                <span className="text-white font-mono text-sm font-semibold">22 anos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Times */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900 to-gray-950">
          <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-orange-500/20 to-transparent" />
          <div className="p-5">
            <p className="text-gray-600 text-xs font-medium uppercase tracking-wider mb-3">Tempos</p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-500 text-sm">Início</span>
                <span className="text-gray-500 font-mono text-sm">{START.toFixed(2)}s</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-gray-500 text-sm">Melhor</span>
                <span className="text-cyan-400 font-mono text-sm font-bold">
                  {loading ? '—' : bestTime ? `${bestTime.toFixed(2)}s` : `${START.toFixed(2)}s`}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-gray-500 text-sm">Último</span>
                <span className="text-white font-mono text-sm font-semibold">
                  {loading ? '—' : latestTime ? `${latestTime.toFixed(2)}s` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-gray-500 text-sm">Objetivo</span>
                <span className="text-orange-400 font-mono text-sm font-semibold">{GOAL.toFixed(2)}s</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── WEEKLY PLAN ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800/80 bg-linear-to-b from-gray-900 to-gray-950">
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-gray-700/50 to-transparent" />
        <div className="p-5">
          <p className="text-gray-600 text-xs font-medium uppercase tracking-wider mb-4">Plano semanal</p>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKLY_PLAN.map((plan, i) => {
              const isToday = i === todayIdx
              const isPast  = i < todayIdx
              return (
                <Link
                  key={plan.day}
                  to={plan.route}
                  className={`rounded-xl p-2 text-center transition-all duration-200 ${
                    isToday
                      ? 'bg-linear-to-b from-cyan-500/15 to-cyan-950/30 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.08)]'
                      : isPast
                      ? 'bg-gray-800/20 border border-gray-800/40 opacity-40'
                      : 'bg-gray-800/30 border border-gray-800/60 hover:bg-gray-800/60 hover:border-gray-700'
                  }`}
                >
                  <p className={`text-xs font-semibold mb-1.5 ${isToday ? 'text-cyan-400' : 'text-gray-600'}`}>
                    {plan.day}
                  </p>
                  <p className="text-base leading-none">{plan.icon}</p>
                  <p className={`text-xs mt-1.5 leading-tight ${isToday ? 'text-gray-300' : 'text-gray-600'}`}>
                    {plan.label.split(' ')[0]}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}
