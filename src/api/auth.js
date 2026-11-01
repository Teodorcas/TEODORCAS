import { supabase } from './supabase'
import { afterWrite } from './cache'

// ─── how the 4-digit access code maps onto a Supabase Auth account ────────
// Supabase rejects passwords shorter than 6 characters, so the code is
// prefixed. The prefix is public — it ships in the bundle — and adds no
// entropy; it only satisfies the length rule. The four digits are still the
// only secret, which is why Supabase's own sign-in rate limiting matters.
const ADMIN_EMAIL = 'admin@teodorcas.app'
const PASSWORD_PREFIX = 'teodorcas'

export function derivePassword(code) {
  return PASSWORD_PREFIX + String(code || '')
}

// ─── store mode: 'selling' | 'debtors' ────────────────────────────────────
// config holds the mode only. The access code lives in Supabase Auth now and
// is never readable from the client.

export async function fetchConfig() {
  const { data, error } = await supabase
    .from('config')
    .select('app_mode')
    .eq('id', 'access_codes')
    .single()

  if (error) throw new Error('Unable to connect. Check your connection.')
  return data
}

// ─── login ────────────────────────────────────────────────────────────────

export async function login(code) {
  const { error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: derivePassword(code),
  })

  if (!error) return { role: 'admin' }

  const message = String(error.message || '')
  if (/invalid login credentials/i.test(message)) {
    throw new Error('Incorrect code. Try again.')
  }
  if (/rate|too many|over_email/i.test(message)) {
    throw new Error('Too many attempts. Wait a moment and try again.')
  }
  throw new Error('Unable to connect. Check your connection.')
}

export async function signOut() {
  try {
    await supabase.auth.signOut()
  } catch {
    // signing out locally must never fail on a network hiccup
  }
}

/**
 * Resetting the access code is resetting the Supabase Auth password. It
 * needs a live session, so it can only be done from a signed-in device —
 * the anon key on its own has no way in.
 */
export async function updateAdminCode(newCode) {
  const { error } = await supabase.auth.updateUser({
    password: derivePassword(newCode),
  })

  if (error) throw new Error('Failed to update admin code.')
  await afterWrite('config')
}

export async function updateAppMode(mode) {
  const { error } = await supabase
    .from('config')
    .update({ app_mode: mode, updated_at: new Date().toISOString() })
    .eq('id', 'access_codes')

  if (error) throw new Error('Failed to update store mode.')
  await afterWrite('config')
}
