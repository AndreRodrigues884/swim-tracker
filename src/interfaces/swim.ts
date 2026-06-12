export interface SwimTime    { id: string; date: string; time_seconds: number }
export interface SwimTimeRow { id: string; date: string; time_seconds: number; location: string | null; created_at: string }
export interface Session     { id: string; date: string; day_type: string; difficulty: number }
export interface Progression { id: string; date: string; exercise: string; load_kg: number }

export interface SwimMetric {
  id:                      string
  date:                    string
  dolphin_kicks_wall:      number | null
  underwater_dist_wall_m:  number | null
  dolphin_kicks_10m:       number | null
  stroke_count_wall:       number | null
  stroke_count_arms_only:  number | null
  notes:                   string | null
}

export interface SwimMetricRow {
  date:                   string
  dolphin_kicks_wall:     number | null
  underwater_dist_wall_m: number | null
  dolphin_kicks_10m:      number | null
  stroke_count_wall:      number | null
  stroke_count_arms_only: number | null
}

export type Trend     = 'improving' | 'plateau' | 'regressing' | 'insufficient'
export type MetricKey = 'dolphin_kicks_wall' | 'underwater_dist_wall_m' | 'dolphin_kicks_10m' | 'stroke_count_wall' | 'stroke_count_arms_only'
export type MetricForm = Record<MetricKey, string> & { date: string; notes: string }
