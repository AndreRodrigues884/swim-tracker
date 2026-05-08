import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Note {
  id: string
  date: string
  type: string
  content: string
  created_at: string
}

// schema check: ('geral','tecnica','nutricao','recuperacao') → mapped from display labels
const TYPES = [
  { label: 'Musculação', value: 'geral',       badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  { label: 'Natação',    value: 'tecnica',      badge: 'bg-cyan-500/10   text-cyan-400   border-cyan-500/20'   },
  { label: 'Nutrição',   value: 'nutricao',     badge: 'bg-green-500/10  text-green-400  border-green-500/20'  },
  { label: 'Outro',      value: 'recuperacao',  badge: 'bg-gray-500/10   text-gray-400   border-gray-500/20'   },
] as const

type TypeValue = typeof TYPES[number]['value']

const TYPE_MAP = Object.fromEntries(TYPES.map(t => [t.value, t])) as Record<TypeValue, typeof TYPES[number]>

export default function Notas() {
  const [notes, setNotes]       = useState<Note[]>([])
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [form, setForm]         = useState({
    date:    new Date().toISOString().split('T')[0],
    type:    'geral' as TypeValue,
    content: '',
  })

  useEffect(() => { fetchNotes() }, [])

  async function fetchNotes() {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setNotes(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) return
    setError(null)
    setSubmitting(true)

    const { error: err } = await supabase.from('notes').insert({
      date:    form.date,
      type:    form.type,
      content: form.content.trim(),
    })

    if (err) {
      setError(err.message)
    } else {
      setForm(f => ({ ...f, content: '' }))
      await fetchNotes()
    }
    setSubmitting(false)
  }

  async function deleteNote(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Notas</h1>
        <p className="text-gray-400 text-sm mt-1">Diário de treino</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add note form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Nova nota</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Tipo</label>
              <div className="flex gap-2 flex-wrap">
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t.value }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      form.type === t.value
                        ? t.badge
                        : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Nota</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={5}
                placeholder="Como correu o treino? O que sentiste? O que melhorar?"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none leading-relaxed transition-colors"
                required
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer"
            >
              {submitting ? 'A guardar…' : 'Guardar nota'}
            </button>
          </form>
        </div>

        {/* Notes list */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <p className="text-gray-500 text-sm">A carregar…</p>
          ) : notes.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-600 text-sm">Sem notas ainda. Adiciona a primeira.</p>
            </div>
          ) : (
            notes.map(note => {
              const typeInfo = TYPE_MAP[note.type as TypeValue]
              return (
                <div key={note.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${typeInfo?.badge ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                        {typeInfo?.label ?? note.type}
                      </span>
                      <span className="text-gray-500 text-xs">{note.date}</span>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-gray-700 hover:text-red-400 text-xs transition-colors cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-gray-300 text-sm mt-3 leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
