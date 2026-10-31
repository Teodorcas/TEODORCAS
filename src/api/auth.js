import { supabase } from './supabase'
import { afterWrite } from './cache'

let failedAttempts = 0
let lockoutUntil = 0

// ─── cached config (admin code + store mode) ──────────────────────────────

export async function fetchConfig() {
  const { data, error } = await supabase
    .from('config')
    .select('admin_code, app_mode')
    .eq('id', 'access_codes')
    .single()

  if (error) throw new Error('Unable to connect. Check your connection.')
  return data
}

// ─── login ────────────────────────────────────────────────────────────────

export async function login(code) {
  if (Date.now() < lockoutUntil) {
    const waitSec = Math.ceil((lockoutUntil - Date.now()) / 1000)
    throw new Error(`Too many failed attempts. Try again in ${waitSec}s.`)
  }

  // Always a live read at login — never trust a cached code here.
  const { data, error } = await supabase
    .from('config')
    .select('admin_code')
    .eq('id', 'access_codes')
    .single()

  if (error) throw new Error('Unable to connect. Check your connection.')

  if (code === data.admin_code) {
    failedAttempts = 0
    return { role: 'admin' }
  }

  failedAttempts++
  if (failedAttempts >= 5) {
    lockoutUntil = Date.now() + (failedAttempts - 4) * 30000 // escalating lockout
    failedAttempts = 0
    throw new Error('Too many failed attempts. Account locked temporarily.')
  }

  throw new Error('Incorrect code. Try again.')
}

export async function updateAdminCode(newCode) {
  const { error } = await supabase
    .from('config')
    .update({ admin_code: newCode, updated_at: new Date().toISOString() })
    .eq('id', 'access_codes')

  if (error) throw new Error('Failed to update admin code.')
  await afterWrite('config')
}

// ─── store mode: 'selling' | 'debtors' ────────────────────────────────────

export async function updateAppMode(mode) {
  const { error } = await supabase
    .from('config')
    .update({ app_mode: mode, updated_at: new Date().toISOString() })
    .eq('id', 'access_codes')

  if (error) throw new Error('Failed to update store mode.')
  await afterWrite('config')
}
