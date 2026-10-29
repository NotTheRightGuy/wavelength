import { StrictMode, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureSession } from './lib/supabase'

function Boot() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const connect = useCallback(() => {
    setStatus('loading')
    ensureSession().then(
      () => setStatus('ready'),
      (e: unknown) => {
        setMessage(e instanceof Error ? e.message : String(e))
        setStatus('error')
      },
    )
  }, [])
  useEffect(connect, [connect])

  if (status === 'ready') return <App />
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-teal-800 p-6 text-center text-[#f7ecd0]">
      {status === 'loading' ? (
        <p className="text-lg font-bold">Connecting…</p>
      ) : (
        <>
          <p className="text-lg font-bold">Could not connect</p>
          <p className="text-sm opacity-80">{message}</p>
          <button onClick={connect} className="h-12 rounded-2xl bg-orange-500 px-6 font-extrabold text-white shadow-[0_4px_0_0_#9a3412]">
            Retry
          </button>
        </>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
)
