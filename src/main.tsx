import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabase } from './lib/supabase'

// Auto-login silently — session persists in localStorage after first login
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  await supabase.auth.signInWithPassword({
    email:    import.meta.env.VITE_SUPABASE_EMAIL,
    password: import.meta.env.VITE_SUPABASE_PASSWORD,
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Fade out and remove the HTML splash screen after React's first paint
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('splash')
    if (!splash) return
    splash.classList.add('out')
    setTimeout(() => splash.remove(), 380)
  })
})
