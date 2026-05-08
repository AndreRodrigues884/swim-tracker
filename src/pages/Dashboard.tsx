import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const START = 13.90
const GOAL = 12.00

const WEEKLY_PLAN = [
  { day: 'Seg', type: 'Natação',       icon: '🏊' },
  { day: 'Ter', type: 'Costas/Peito',  icon: '🏋️' },
  { day: 'Qua', type: 'Ombros/Core',   icon: '💪' },
  { day: 'Qui', type: 'Pernas+Natação',icon: '🦵' },
  { day: 'Sex', type: 'Bíceps/Tri',    icon: '💪' },
  { day: 'Sáb', type: 'Costas/Peito',  icon: '🏋️' },
  { day: 'Dom', type: 'Mobilidade',    icon: '🧘' },
]

// getDay(): 0=Dom → plano índice 6; 1=Seg → 0; etc.
const todayIdx = (new Date().getDay() + 6) % 7

export default function Dashboard() {
  const [bestTime, setBestTime] = useState<number | null>(null)
  const [sessionsThisMonth, setSessionsThisMonth] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStr = monthStart.toISOString().split('T')[0]

    Promise.all([
      supabase
        .from('swim_times')
        .select('time_seconds')
        .order('time_seconds', { ascending: true })
        .limit(1),
      supabase
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('date', monthStr),
    ]).then(([swim, sessions]) => {
      if (swim.data?.[0]) setBestTime(swim.data[0].time_seconds)
      setSessionsThisMonth(sessions.count ?? 0)
      setLoading(false)
    })
  }, [])

  const progress =
    bestTime !== null
      ? Math.min(100, Math.max(0, ((START - bestTime) / (START - GOAL)) * 100))
      : 0

  const today    = WEEKLY_PLAN[todayIdx]
  const tomorrow = WEEKLY_PLAN[(todayIdx + 1) % 7]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Bem-vindo, André 👋</p>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Progress card */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-2">Progresso 50m Freestyle</p>
          <p className="text-4xl font-bold font-mono text-cyan-400 mb-4">
            {loading ? '—' : bestTime !== null ? `${bestTime.toFixed(2)}s` : `${START.toFixed(2)}s`}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Início: {START.toFixed(2)}s</span>
              <span>Objetivo: {GOAL.toFixed(2)}s</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-cyan-700 to-cyan-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(2, progress)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{progress.toFixed(1)}% concluído</span>
              {bestTime !== null && (
                <span>
                  Faltam{' '}
                  <span className="text-white font-mono">{(bestTime - GOAL).toFixed(2)}s</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sessions this month */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
          <p className="text-gray-400 text-sm">Treinos este mês</p>
          <p className="text-5xl font-bold text-white mt-2">
            {loading ? '—' : sessionsThisMonth}
          </p>
          <p className="text-gray-600 text-xs mt-2">sessões registadas</p>
        </div>
      </div>

      {/* Today's workout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-3">Treino de hoje</p>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{today.icon}</span>
            <div>
              <p className="text-white font-bold text-xl">{today.type}</p>
              <p className="text-gray-500 text-sm">{today.day} · hoje</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-3">
            <p className="text-gray-600 text-xs">Amanhã:</p>
            <span>{tomorrow.icon}</span>
            <span className="text-gray-400 text-sm">{tomorrow.type}</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-3">Métricas</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Melhor tempo</span>
              <span className="text-cyan-400 font-mono font-semibold">
                {bestTime !== null ? `${bestTime.toFixed(2)}s` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Objetivo</span>
              <span className="text-white font-mono">12.00s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Margem</span>
              <span className="text-orange-400 font-mono">
                {bestTime !== null ? `−${(bestTime - GOAL).toFixed(2)}s` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly plan */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Plano semanal</h2>
        <div className="grid grid-cols-7 gap-2">
          {WEEKLY_PLAN.map((plan, i) => {
            const isToday = i === todayIdx
            return (
              <div
                key={plan.day}
                className={`rounded-lg p-2.5 text-center ${
                  isToday
                    ? 'bg-cyan-500/10 border border-cyan-500/25'
                    : 'bg-gray-800/40 border border-gray-800'
                }`}
              >
                <p className={`text-xs font-semibold mb-1.5 ${isToday ? 'text-cyan-400' : 'text-gray-500'}`}>
                  {plan.day}
                </p>
                <p className="text-xl leading-none">{plan.icon}</p>
                <p className={`text-xs mt-1.5 leading-tight ${isToday ? 'text-gray-300' : 'text-gray-600'}`}>
                  {plan.type}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
