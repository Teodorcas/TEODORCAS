import { supabase } from './supabase'
import { afterWrite } from './cache'

export async function fetchDebtors() {
  const { data, error } = await supabase
    .from('debtors')
    .select('*')
    .order('name')

  if (error) throw new Error('Failed to load debtors.')
  return data
}

export async function fetchDebtorEntries() {
  const { data, error } = await supabase
    .from('debtor_entries')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) throw new Error('Failed to load debt history.')
  return data
}

/** Latest running balance per debtor id. */
export function balancesFrom(entries) {
  const map = new Map()
  for (const entry of entries || []) {
    if (!map.has(entry.debtor_id)) map.set(entry.debtor_id, Number(entry.balance_after))
  }
  return map
}

/** name, balance, last activity — one row per debtor. */
export function buildSummaries(debtors, entries) {
  const balances = balancesFrom(entries)
  return (debtors || []).map(debtor => {
    const entriesForDebtor = (entries || []).filter(e => e.debtor_id === debtor.id)
    return {
      ...debtor,
      balance: balances.has(debtor.id) ? balances.get(debtor.id) : 0,
      entryCount: entriesForDebtor.length,
      lastActivity: entriesForDebtor[0]?.timestamp || debtor.created_at,
    }
  })
}

async function currentBalance(debtorId) {
  const { data, error } = await supabase
    .from('debtor_entries')
    .select('balance_after')
    .eq('debtor_id', debtorId)
    .order('timestamp', { ascending: false })
    .limit(1)

  if (error) throw new Error('Failed to read debt history.')
  return data && data.length ? Number(data[0].balance_after) : 0
}

async function appendEntry(debtorId, type, amount, note) {
  const balance = await currentBalance(debtorId)
  const next = type === 'debt' ? balance + amount : balance - amount

  if (next < 0) {
    throw new Error(`Payment exceeds the amount owed (${balance}).`)
  }

  const { error } = await supabase.from('debtor_entries').insert({
    debtor_id: debtorId,
    type,
    amount,
    note: note || null,
    balance_after: next,
  })

  if (error) throw new Error('Failed to record transaction.')
  return next
}

async function findDebtorIdByName(name) {
  const { data, error } = await supabase.from('debtors').select('id, name')
  if (error) throw new Error('Failed to read debtors.')
  const wanted = name.trim().toLowerCase()
  const match = (data || []).find(d => d.name.trim().toLowerCase() === wanted)
  return match ? match.id : null
}

/**
 * Records debt for a debtor. Creates the debtor if the name is new,
 * otherwise appends to their existing history.
 * @returns {Promise<{debtorId: string, balance: number}>}
 */
export async function recordDebt({ debtorId, debtorName, amount, note }) {
  const cleanName = (debtorName || '').trim()
  if (!debtorId && !cleanName) throw new Error('Debtor name is required.')

  const value = Number(amount)
  if (!value || value <= 0) throw new Error('Enter a valid amount.')

  let id = debtorId

  if (!id) {
    id = await findDebtorIdByName(cleanName)
  }

  if (!id) {
    const { data, error } = await supabase
      .from('debtors')
      .insert({ name: cleanName })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') throw new Error('That debtor already exists.')
      throw new Error('Failed to add debtor.')
    }
    id = data.id
  }

  const balance = await appendEntry(id, 'debt', value, note)
  await afterWrite('debtors', 'debtor_entries')
  return { debtorId: id, balance }
}

/**
 * Records a payment — full or partial — against an existing debtor.
 * @returns {Promise<number>} new balance
 */
export async function recordPayment({ debtorId, amount }) {
  const value = Number(amount)
  if (!value || value <= 0) throw new Error('Enter a valid amount.')
  if (!debtorId) throw new Error('Select a debtor first.')

  const balance = await appendEntry(debtorId, 'payment', value, null)
  await afterWrite('debtors', 'debtor_entries')
  return balance
}
