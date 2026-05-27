export interface Ex         { id: string; name: string; sets: number; reps: string; has_weight: boolean }
export interface ChartGroup  { label: string; exerciseIds: string[] }
export interface WDay        { key: string; label: string; days: string; exercises: Ex[]; chartGroups?: ChartGroup[] }

export const WORKOUTS: WDay[] = [
  {
    key: 'costas-peito', label: 'Costas & Peito', days: 'Ter / Sáb',
    exercises: [
      { id: 'pu-w',   name: 'Pull-ups com peso',       sets: 6, reps: '5',  has_weight: true  },
      { id: 'pu-n',   name: 'Pull-ups normais',         sets: 4, reps: '10', has_weight: true  },
      { id: 'cu-w',   name: 'Chin-ups com peso',        sets: 3, reps: '8',  has_weight: true  },
      { id: 'dips-w', name: 'Dips com peso',            sets: 6, reps: '5',  has_weight: true  },
      { id: 'dips-n', name: 'Dips normais',             sets: 4, reps: '12', has_weight: true  },
    ],
    chartGroups: [
      { label: 'Costas', exerciseIds: ['pu-w', 'pu-n', 'cu-w'] },
      { label: 'Dips',   exerciseIds: ['dips-w', 'dips-n']     },
    ],
  },
  {
    key: 'ombros', label: 'Ombros', days: 'Qua',
    exercises: [
      { id: 'press-m', name: 'Press militar curl bar',  sets: 6, reps: '5',  has_weight: true },
      { id: 'arnold',  name: 'Arnold press',            sets: 4, reps: '10', has_weight: true },
      { id: 'lat-r',   name: 'Elevações laterais',      sets: 4, reps: '15', has_weight: true },
      { id: 'upright', name: 'Upright rows curl bar',   sets: 3, reps: '12', has_weight: true },
    ],
  },
  {
    key: 'pernas', label: 'Pernas & Potência', days: 'Qui',
    exercises: [
      { id: 'squat',   name: 'Agachamento curl bar',      sets: 5, reps: '5',  has_weight: true  },
      { id: 'rdl',     name: 'Romanian deadlift curl bar', sets: 5, reps: '8',  has_weight: true  },
      { id: 'bjump',   name: 'Broad jump',                 sets: 5, reps: '5',  has_weight: false },
      { id: 'calfs',   name: 'Calf raises curl bar',       sets: 4, reps: '20', has_weight: true  },
      { id: 'hip-thr', name: 'Hip thrust',                 sets: 3, reps: '15', has_weight: true  },
    ],
  },
  {
    key: 'bic-tri', label: 'Bíceps & Tríceps', days: 'Sex',
    exercises: [
      { id: 'bb-curl',   name: 'Barbell curl curl bar',      sets: 4, reps: '10', has_weight: true },
      { id: 'hammer',    name: 'Curl martelo',                sets: 4, reps: '12', has_weight: true },
      { id: 'conc',      name: 'Curl concentrado',            sets: 3, reps: '10', has_weight: true },
      { id: 'skull',     name: 'Skull crushers curl bar',     sets: 4, reps: '10', has_weight: true },
      { id: 'tri-ext',   name: 'Tricep extensions curl bar',  sets: 4, reps: '12', has_weight: true },
      { id: 'oh-tri',    name: 'Overhead unilateral tricep ext', sets: 3, reps: '12', has_weight: true },
      { id: 'wrist',     name: 'Wrist curls curl bar',        sets: 4, reps: '15', has_weight: true },
      { id: 'rev-wrist', name: 'Reverse wrist curls',         sets: 3, reps: '15', has_weight: true },
    ],
    chartGroups: [
      { label: 'Bíceps',  exerciseIds: ['bb-curl', 'hammer', 'conc']    },
      { label: 'Tríceps', exerciseIds: ['skull', 'tri-ext', 'kick']     },
    ],
  },
]
