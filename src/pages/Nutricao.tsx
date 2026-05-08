interface Meal {
  name: string
  kcal: number
  foods: string[]
  note?: string
  highlight?: 'pre' | 'post'
}

const MEALS: Meal[] = [
  {
    name: 'Pequeno-almoço',
    kcal: 700,
    foods: [
      '4 ovos mexidos ou estrelados',
      '80g aveia com leite',
      '1 banana',
      'Café sem açúcar',
    ],
  },
  {
    name: 'Lanche da manhã',
    kcal: 300,
    foods: [
      '200g iogurte grego natural',
      '30g frutos secos (amêndoas/nozes)',
      '1 fruta',
    ],
  },
  {
    name: 'Almoço',
    kcal: 850,
    foods: [
      '200g frango grelhado / atum / salmão',
      '150g arroz cozido',
      'Legumes à vontade',
      'Fio de azeite',
    ],
  },
  {
    name: 'Pré-treino',
    kcal: 250,
    highlight: 'pre',
    note: 'Come 1h antes — faz diferença na energia dos sprints',
    foods: [
      '2 fatias pão integral + manteiga de amendoim',
      '1 banana',
    ],
  },
  {
    name: 'Pós-treino',
    kcal: 200,
    highlight: 'post',
    note: 'Até 30 min depois do treino',
    foods: [
      '30–40g proteína em pó',
      'Alternativa: 200g queijo cottage + fruta',
    ],
  },
  {
    name: 'Jantar',
    kcal: 750,
    foods: [
      '200g carne vermelha magra (2-3×/sem) / frango / peixe',
      '200g batata doce ou massa integral',
      'Salada grande com azeite e vinagre',
    ],
  },
  {
    name: 'Snack noturno',
    kcal: 200,
    note: 'Proteína de absorção lenta — recuperação durante o sono',
    foods: [
      '200g queijo cottage ou iogurte grego',
    ],
  },
]

const MACROS = [
  { label: 'Calorias',  value: '~3250', unit: 'kcal', color: 'text-cyan-400' },
  { label: 'Proteína',  value: '~195',  unit: 'g',    color: 'text-violet-400' },
  { label: 'Hidratos',  value: '~370',  unit: 'g',    color: 'text-orange-400' },
  { label: 'Gorduras',  value: '~90',   unit: 'g',    color: 'text-yellow-400' },
]

const TIPS = [
  {
    icon: '💊',
    title: 'Suplementação',
    body: 'Creatina 5g/dia (qualquer altura). Proteína em pó se não atingires os 195g diários de proteína.',
  },
  {
    icon: '🏊',
    title: 'Dias de natação',
    body: 'Come o pré-treino mesmo que seja de manhã cedo — não entres na água em jejum nos dias de sprints.',
  },
  {
    icon: '😴',
    title: 'Domingo (descanso)',
    body: 'Reduz hidratos em ~100g (menos arroz, massa, batata). Mantém a proteína igual — 195g mínimo.',
  },
]

export default function Nutricao() {
  const totalKcal = MEALS.reduce((s, m) => s + m.kcal, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Nutrição</h1>
        <p className="text-gray-400 text-sm mt-1">
          Plano alimentar · {totalKcal} kcal/dia · foco em força + sprint
        </p>
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {MACROS.map(m => (
          <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">{m.label}</p>
            <p className={`text-2xl font-bold font-mono ${m.color}`}>
              {m.value}
              <span className="text-sm font-normal ml-1 text-gray-500">{m.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Meal cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MEALS.map(meal => {
          const isPre  = meal.highlight === 'pre'
          const isPost = meal.highlight === 'post'

          const borderCls = isPre
            ? 'border-orange-500/30'
            : isPost
            ? 'border-violet-500/30'
            : 'border-gray-800'

          const bgCls = isPre
            ? 'bg-orange-500/5'
            : isPost
            ? 'bg-violet-500/5'
            : 'bg-gray-900'

          const kcalCls = isPre
            ? 'text-orange-400'
            : isPost
            ? 'text-violet-400'
            : 'text-cyan-400'

          const badgeCls = isPre
            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
            : isPost
            ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
            : null

          return (
            <div key={meal.name} className={`rounded-xl border p-5 ${bgCls} ${borderCls}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-white font-semibold">{meal.name}</h2>
                  {badgeCls && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${badgeCls}`}>
                      {isPre ? 'Pré-treino' : 'Pós-treino'}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-mono font-semibold shrink-0 ${kcalCls}`}>
                  ~{meal.kcal} kcal
                </span>
              </div>

              <ul className="space-y-1.5">
                {meal.foods.map(food => (
                  <li key={food} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-gray-600 mt-0.5 shrink-0">·</span>
                    {food}
                  </li>
                ))}
              </ul>

              {meal.note && (
                <p className={`mt-3 pt-3 border-t text-xs leading-relaxed ${
                  isPre
                    ? 'border-orange-500/20 text-orange-300/70'
                    : isPost
                    ? 'border-violet-500/20 text-violet-300/70'
                    : 'border-gray-800 text-gray-500'
                }`}>
                  ⚡ {meal.note}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Tips */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Notas & Suplementação</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIPS.map(tip => (
            <div key={tip.title} className="flex gap-3">
              <span className="text-2xl shrink-0">{tip.icon}</span>
              <div>
                <p className="text-white font-medium text-sm">{tip.title}</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{tip.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
