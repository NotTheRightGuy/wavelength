import { createClient } from '@supabase/supabase-js'
import { dedupe } from './dedupe'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

export const ensureSession: () => Promise<string> = dedupe(async () => {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user.id
  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error || !anon.user) throw error ?? new Error('anonymous sign-in failed')
  return anon.user.id
})
