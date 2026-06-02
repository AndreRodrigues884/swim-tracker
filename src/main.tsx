import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabase } from './lib/supabase'

// Auto-login — always refresh to ensure a valid token
const { error: authError } = await supabase.auth.signInWithPassword({
  email:    import.meta.env.VITE_SUPABASE_EMAIL,
  password: import.meta.env.VITE_SUPABASE_PASSWORD,
})
if (authError) console.error('[auth] login failed:', authError.message)

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
