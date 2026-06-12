export type Diff     = 'easy' | 'medium' | 'hard'
export type ExecType = 'continuous' | 'mini_pause' | 'rest_pause'

export interface Ex           { id: string; name: string; sets: number; reps: string; has_weight: boolean }
export interface ChartGroup   { label: string; exerciseIds: string[] }
export interface WDay         { key: string; label: string; days: string; exercises: Ex[]; chartGroups?: ChartGroup[] }
export interface SetEntry     { diff: Diff; weight: string; reps: string; execType: ExecType }
export interface ChartPt      { date: string; vol: number }
export interface GroupedChart { label: string; pts: ChartPt[] }
export interface LastEntry    { weight: string | null; reps: string | null }
