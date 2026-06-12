import type { SwimTime, Session, Progression, SwimMetric, SwimMetricRow, Trend, MetricKey, MetricForm } from '../interfaces/swim'
import type { Note } from '../interfaces/notes'
export type { SwimTime, Session, Progression, SwimMetric, SwimMetricRow, Trend, MetricKey, MetricForm }
export type { Note }

export const emptyForm = (): MetricForm => ({
  date:                   new Date().toISOString().split('T')[0],
  dolphin_kicks_wall:     '',
  underwater_dist_wall_m: '',
  dolphin_kicks_10m:      '',
  stroke_count_wall:      '',
  stroke_count_arms_only: '',
  notes:                  '',
})

// ─── Metric definitions ───────────────────────────────────────────────────────

export const TECH_METRICS = [
  { key: 'dolphin_kicks_wall'     as const, label: 'Dolphin kicks (parede)', unit: 'kicks', color: '#22d3ee', desc: 'Ideal: 5–7 · menos = mais potência' },
  { key: 'underwater_dist_wall_m' as const, label: 'Distância subaquática',  unit: 'm',     color: '#60a5fa', desc: 'Ideal: 7–10m · mais = melhor'        },
  { key: 'dolphin_kicks_10m'      as const, label: 'Kicks / 10m',            unit: 'kicks', color: '#a78bfa', desc: 'Ideal: 5–8 · parado, sem impulso'     },
  { key: 'stroke_count_wall'      as const, label: 'Braçadas (c/ pernas)',   unit: 'braç.', color: '#fb923c', desc: 'Ideal: 13–17 · menos = melhor'        },
  { key: 'stroke_count_arms_only' as const, label: 'Braçadas (só braçada)',  unit: 'braç.', color: '#f472b6', desc: 'Ideal: 13–17 · menos = mais força'    },
] as const

export const TECH_SCORING: Record<string, { ideal: number; worst: number; higherIsBetter: boolean }> = {
  dolphin_kicks_wall:     { ideal: 5,  worst: 12, higherIsBetter: false },
  underwater_dist_wall_m: { ideal: 10, worst: 5,  higherIsBetter: true  },
  dolphin_kicks_10m:      { ideal: 5,  worst: 15, higherIsBetter: false },
  stroke_count_wall:      { ideal: 13, worst: 25, higherIsBetter: false },
  stroke_count_arms_only: { ideal: 13, worst: 25, higherIsBetter: false },
}

export function metricScore(key: string, value: number): number {
  const s = TECH_SCORING[key]
  if (!s) return 0
  const raw = s.higherIsBetter
    ? (value - s.worst) / (s.ideal - s.worst)
    : (s.worst - value) / (s.worst - s.ideal)
  return Math.round(Math.min(100, Math.max(0, raw * 100)))
}

export const GROUPS = [
  {
    id:    'wall',
    label: 'Empurrão da parede',
    desc:  'Métricas a partir de empurrão da parede (sem salto) — mais fácil de medir no treino diário',
    items: [
      {
        key: 'dolphin_kicks_wall' as const,
        label: 'Dolphin kicks', unit: 'kicks', step: '1', min: '1', max: '15',
        tip:   'Kicks após empurrão da parede até surfaçar. Ideal: 5–7 kicks fortes e compactos.',
        ideal: '5–7', icon: '🐬',
      },
      {
        key: 'underwater_dist_wall_m' as const,
        label: 'Distância subaquática', unit: 'm', step: '0.5', min: '1', max: '15',
        tip:   'Metros em underwater após empurrão da parede. Ideal: 7–10m para um atleta de 196cm.',
        ideal: '7–10 m', icon: '📏',
      },
      {
        key: 'dolphin_kicks_10m' as const,
        label: 'Dolphin kicks / 10m', unit: 'kicks', step: '1', min: '1', max: '15',
        tip:   'Corpo parado, sem impulso — conta quantos dolphin kicks precisas para percorrer 10m em underwater. Mede a potência isolada do kick, sem momentum da parede. Objetivo: reduzir ao longo do tempo.',
        ideal: '5–8', icon: '🐬',
      },
      {
        key: 'stroke_count_wall' as const,
        label: 'Braçadas em 25m', unit: 'braçadas', step: '1', min: '5', max: '40',
        tip:   'Ciclos de braçada desde o breakout até à parede, após empurrão. Ideal para 196cm: 13–17 braçadas.',
        ideal: '13–17', icon: '🤿',
      },
      {
        key: 'stroke_count_arms_only' as const,
        label: 'Braçadas (só braçada)', unit: 'braçadas', step: '1', min: '5', max: '40',
        tip:   'Ciclos de braçada em 25m com pernas paradas ou pull buoy — mede a força da braçada isolada. Objetivo: reduzir ao longo do tempo (braçadas mais largas e eficientes).',
        ideal: '13–17', icon: '💪',
      },
    ],
  },
] as const

export const TREND_STYLE: Record<Trend, { label: string; pill: string }> = {
  improving:    { label: 'A melhorar',         pill: 'bg-green-400/10 border-green-400/20 text-green-400'     },
  plateau:      { label: 'Plateau',             pill: 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400'  },
  regressing:   { label: 'A regredir',          pill: 'bg-red-400/10 border-red-400/20 text-red-400'           },
  insufficient: { label: 'Dados insuficientes', pill: 'bg-gray-400/10 border-gray-400/20 text-gray-400'        },
}
