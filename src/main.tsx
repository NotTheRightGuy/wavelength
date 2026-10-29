import { StrictMode, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RotateCwIcon } from 'lucide-react'
import './index.css'
import App from './App.tsx'
import { Cardstock, DialEmblem, GameHeading, PlasticButton } from './components/game'
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <DialEmblem className="w-40" />
      {status === 'loading' ? (
        <p role="status" className="font-display text-subheading text-on-table">Connecting…</p>
      ) : (
        <Cardstock pattern padding="lg" className="flex w-full flex-col items-center gap-3" role="alert">
          <GameHeading level={1} size="heading" tone="card">Could not connect</GameHeading>
          <p className="text-base break-words text-ink-soft">{message}</p>
          <p className="text-base text-ink-soft">Check your connection, then try again.</p>
          <PlasticButton size="lg" block onClick={connect} className="mt-2">
            <RotateCwIcon />
            Retry
          </PlasticButton>
        </Cardstock>
      )}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
)
