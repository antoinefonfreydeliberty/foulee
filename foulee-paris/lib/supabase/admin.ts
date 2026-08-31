import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Client admin (service role) — SERVER-SIDE UNIQUEMENT. Bypass RLS.
// Toutes les écritures sensibles (compte, mise, règlement) passent par ici,
// jamais depuis le client. RLS est deny-all : l'anon key ne peut rien lire/écrire.
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase env manquant (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
