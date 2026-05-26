import type { SwimTime, Session, Progression, Note, SwimMetric, Trend } from '../data/techMetrics'

const GOAL       = 12.0
const START_TIME = 13.90

export function weeklyRate(times: SwimTime[]): number | null {
  if (times.length < 2) return null
  const n  = times.length
  const x  = times.map(t => new Date(t.date).getTime() / (7 * 86_400_000))
  const y  = times.map(t => t.time_seconds)
  const mx = x.reduce((a, b) => a + b) / n
  const my = y.reduce((a, b) => a + b) / n
  const num = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0)
  const den = x.reduce((s, xi) => s + (xi - mx) ** 2, 0)
  return den === 0 ? null : num / den
}

export function etaFromRate(times: SwimTime[], rate: number | null): string | null {
  if (!rate || rate >= 0 || !times.length) return null
  const latest    = times[times.length - 1]
  const weeksLeft = (latest.time_seconds - GOAL) / Math.abs(rate)
  const ms        = new Date(latest.date).getTime() + weeksLeft * 7 * 86_400_000
  return new Date(ms).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
}

export function avgSessionsPerWeek(sessions: Session[]): number {
  if (!sessions.length) return 0
  const cutoff = new Date(Date.now() - 28 * 86_400_000)
  return Math.round((sessions.filter(s => new Date(s.date) >= cutoff).length / 4) * 10) / 10
}

export function trendStatus(times: SwimTime[]): Trend {
  if (times.length < 3) return 'insufficient'
  const last = times.slice(-3)
  const avg  = ((last[1].time_seconds - last[0].time_seconds) + (last[2].time_seconds - last[1].time_seconds)) / 2
  if (avg < -0.05) return 'improving'
  if (avg >  0.05) return 'regressing'
  return 'plateau'
}

export function buildPrompt(
  swimTimes:    SwimTime[],
  sessions:     Session[],
  progressions: Progression[],
  notes:        Note[],
  metrics:      SwimMetric[],
  rate:         number | null,
  eta:          string | null,
  spw:          number,
  trend:        Trend,
): string {
  const timesStr = swimTimes.slice(-8).map(t => `  ${t.date}: ${t.time_seconds}s`).join('\n')

  const sessStr = [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
    .map(s => `  ${s.date}: ${s.day_type} (dif. ${s.difficulty}/10)`).join('\n')

  const progStr = [...progressions]
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)
    .map(p => `  ${p.date}: ${p.exercise} — ${p.load_kg}kg`).join('\n')

  const notesStr = [...notes]
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
    .map(n => `  [${n.type}] ${n.date}: ${n.content}`).join('\n')

  const latest      = swimTimes.length ? swimTimes[swimTimes.length - 1].time_seconds : null
  const best        = swimTimes.length ? Math.min(...swimTimes.map(t => t.time_seconds)) : null
  const improvement = (latest && best) ? START_TIME - best : 0

  const latestMetric = metrics[0] ?? null
  const techCurrent = latestMetric ? `
Data: ${latestMetric.date}
  [Empurrão da parede]
    Dolphin kicks        : ${latestMetric.dolphin_kicks_wall     ?? 'N/A'} (ideal: 5–7)
    Distância subaquát.  : ${latestMetric.underwater_dist_wall_m ?? 'N/A'} m (ideal: 7–10m)
    Kicks / 10m          : ${latestMetric.dolphin_kicks_10m      ?? 'N/A'} (ideal: 5–8, corpo parado sem impulso, menos = mais potência)
    Braçadas (c/ pernas) : ${latestMetric.stroke_count_wall      ?? 'N/A'} (ideal para 196cm: 13–17)
    Braçadas (só braçada): ${latestMetric.stroke_count_arms_only ?? 'N/A'} (força da braçada isolada)
  ${latestMetric.notes ? `Notas: ${latestMetric.notes}` : ''}`.trim() : '  (sem dados técnicos registados ainda)'

  const techHistory = metrics.slice(1, 4).map(m =>
    `  ${m.date}: parede(kicks=${m.dolphin_kicks_wall ?? '?'}, sub=${m.underwater_dist_wall_m ?? '?'}m, kicks10m=${m.dolphin_kicks_10m ?? '?'}, braç=${m.stroke_count_wall ?? '?'}, braçSóBraço=${m.stroke_count_arms_only ?? '?'})`
  ).join('\n')

  return `Sou o André, 22 anos, 196cm, 93kg. Objetivo: 25m freestyle em 12.00s.

--- PERFORMANCE ---
Tempo inicial: ${START_TIME}s | Melhor: ${best ?? 'N/A'}s | Último: ${latest ?? 'N/A'}s
Melhoria total: ${improvement > 0 ? `-${improvement.toFixed(2)}s` : '0s'}
Taxa: ${rate ? `${Math.abs(rate).toFixed(3)}s/semana ${rate < 0 ? '(a melhorar)' : '(a piorar)'}` : 'N/A'}
ETA 12s: ${eta ?? 'não calculável'} | Treinos/sem: ${spw} | Tendência: ${trend}

--- ÚLTIMOS TEMPOS ---
${timesStr || '(sem registos)'}

--- DADOS TÉCNICOS (mais recente) ---
${techCurrent}

--- HISTÓRICO TÉCNICO ---
${techHistory || '  (sem histórico adicional)'}

--- TREINOS RECENTES ---
${sessStr || '(sem registos)'}

--- PROGRESSÕES DE FORÇA ---
${progStr || '(sem registos)'}

--- NOTAS ---
${notesStr || '(sem notas)'}

Analisa o meu perfil técnico e de performance. Responde com:
1. **Nível técnico atual** — onde estou comparado com o objetivo de 12s? O que os dados técnicos revelam?
2. **Ponto crítico #1** — qual a maior limitação técnica com base nos dados (dolphin kicks, underwater, eficiência de kicks/10m, braçadas)?
3. **Plano desta semana** — 2-3 ações concretas e específicas (ex: "nos próximos treinos foca X sessions a fazer Y")
4. **O que está bem** — o que devo continuar a fazer

Sê direto, técnico e específico. Usa os números reais. Máximo 320 palavras. Português de Portugal.`
}
