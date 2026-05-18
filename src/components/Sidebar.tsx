import { NavLink } from 'react-router-dom'

const links = [
  { to: '/',             label: 'Dashboard',   icon: '📊' },
  { to: '/treino',       label: 'Treino',       icon: '🏋️' },
  { to: '/natacao',      label: 'Natação',      icon: '🏊' },
  { to: '/core',         label: 'Core & Mobilidade', icon: '💪' },
  { to: '/nutricao',     label: 'Nutrição',     icon: '🥗' },
  { to: '/estatisticas', label: 'Estatísticas', icon: '📈' },
  { to: '/treinador',    label: 'Treinador IA', icon: '🤖' },
]

interface Props {
  onClose: () => void
}

export default function Sidebar({ onClose }: Props) {
  return (
    <>
      <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between shrink-0">
        <div>
          <p className="text-cyan-400 font-bold text-lg tracking-tight">🌊 SwimTracker</p>
          <p className="text-gray-500 text-xs mt-0.5">André · 50m freestyle</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-gray-500 hover:text-white transition-colors p-1 text-lg leading-none cursor-pointer"
          aria-label="Fechar menu"
        >
          ✕
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-gray-800 shrink-0">
        <p className="text-gray-600 text-xs">Objetivo: 13.90s → 12.00s</p>
      </div>
    </>
  )
}
