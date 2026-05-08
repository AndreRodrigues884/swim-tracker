import { useState } from 'react'

const CONTEXT_PREFIX =
  'És um treinador de natação especializado em sprints de 50m freestyle, ' +
  'inspirado no método de Cameron McEvoy. Sou André, 22 anos, 196cm, 93kg, ' +
  'tempo atual ~13.90s, objetivo entrar na faixa dos 12s. ' +
  'Analisa o que descrevo e dá 3-5 dicas técnicas concretas sobre: ' +
  'saída de blocos, underwater/dolphin kick, catch, braçada, respiração. ' +
  'Responde em português de Portugal.\n\n'

const CLAUDE_BASE = 'https://claude.ai/chat/aeaad219-7a93-4f0e-8b27-bb0d77f66586'

export default function Tecnica() {
  const [input, setInput] = useState('')

  function handleAnalyse(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const q = encodeURIComponent(CONTEXT_PREFIX + input.trim())
    window.open(`${CLAUDE_BASE}?q=${q}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Técnica IA</h1>
        <p className="text-gray-400 text-sm mt-1">
          Análise personalizada · método McEvoy · 50m freestyle
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-1">Descreve a tua sessão</h2>
          <p className="text-gray-500 text-xs mb-4 leading-relaxed">
            Como te sentiste na água? Saída de blocos, underwater, catch, braçada,
            respiração — quanto mais detalhe, melhor a análise.
          </p>
          <form onSubmit={handleAnalyse} className="space-y-4">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={9}
              placeholder={
                'Ex: Nadei hoje 13.90s. A saída de blocos correu bem mas sinto que perco muito nos primeiros metros depois do underwater. ' +
                'A respiração a meio da piscina atrasa-me bastante. ' +
                'O lado direito da braçada parece mais fraco que o esquerdo...'
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none leading-relaxed transition-colors"
              required
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer"
            >
              Analisar no Claude →
            </button>
          </form>
        </div>

        {/* Info panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col">
          <h2 className="text-white font-semibold mb-4">O que será analisado</h2>
          <div className="space-y-3 text-sm">
            {[
              { icon: '🚀', title: 'Saída de blocos', desc: 'Tempo de reação, posição, ângulo de entrada na água.' },
              { icon: '🐬', title: 'Underwater / Dolphin kick', desc: 'Profundidade, número de ciclos, ritmo de ondulação.' },
              { icon: '🤿', title: 'Catch & Pull', desc: 'Ponto de captura, ângulo do cotovelo, tração eficaz.' },
              { icon: '💧', title: 'Braçada', desc: 'Frequência vs. distância por braçada, simetria.' },
              { icon: '💨', title: 'Respiração', desc: 'Frequência, rotação da cabeça, impacto na velocidade.' },
            ].map(item => (
              <div key={item.title} className="flex gap-3">
                <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-white font-medium">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-4 border-t border-gray-800">
            <p className="text-gray-600 text-xs leading-relaxed">
              O teu contexto (André · 196cm · 93kg · 13.90s → 12.00s) é incluído
              automaticamente em cada análise.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
