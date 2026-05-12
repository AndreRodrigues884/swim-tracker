import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Treino from './pages/Treino'
import Natacao from './pages/Natacao'
import Core from './pages/Core'
import Nutricao from './pages/Nutricao'
import Notas from './pages/Notas'
import Estatisticas from './pages/Estatisticas'
import Tecnica from './pages/Tecnica'
import Treinador from './pages/Treinador'

export default function App() {
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  // Lock body scroll while drawer is open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-950 text-white">

        {/* Mobile overlay — fades in/out, never blocks clicks when hidden */}
        <div
          className={`fixed inset-0 bg-black/60 z-20 md:hidden transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={close}
          aria-hidden="true"
        />

        {/* Sidebar
            mobile : fixed, slides from left (-translate-x-full → translate-x-0)
            desktop: sticky, always visible (md:translate-x-0 overrides mobile class) */}
        <aside
          className={`
            fixed md:sticky top-0 left-0 inset-y-0 h-screen z-30
            w-64 shrink-0 flex flex-col
            bg-gray-900 border-r border-gray-800
            transition-transform duration-300 ease-in-out
            md:translate-x-0
            ${open ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onClose={close} />
        </aside>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Mobile topbar — hidden on desktop */}
          <header className="sticky top-0 z-10 md:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
            <span className="text-white font-bold text-lg tracking-tight">André.</span>
            <button
              onClick={() => setOpen(true)}
              className="text-gray-400 hover:text-white transition-colors p-1 leading-none text-xl cursor-pointer"
              aria-label="Abrir menu"
            >
              ☰
            </button>
          </header>

          <main className="flex-1 p-4 md:p-8">
            <Routes>
              <Route path="/"             element={<Dashboard />} />
              <Route path="/treino"       element={<Treino />} />
              <Route path="/natacao"      element={<Natacao />} />
              <Route path="/core"         element={<Core />} />
              <Route path="/nutricao"     element={<Nutricao />} />
              <Route path="/notas"        element={<Notas />} />
              <Route path="/estatisticas" element={<Estatisticas />} />
              <Route path="/tecnica"      element={<Tecnica />} />
              <Route path="/treinador"    element={<Treinador />} />
            </Routes>
          </main>

        </div>
      </div>
    </BrowserRouter>
  )
}
