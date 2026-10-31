import { supabase } from './supabase'
import { startOfDay, startOfMonth, startOfYear, subDays } from 'date-fns'
import { afterWrite } from './cache'
import { applySale, formatSachets, doseSachets } from '../utils/stock'

/**
 * Resolves a period filter into an absolute window.
 * @returns {{start: Date, end?: Date, inclusive?: boolean}}
 */
export function resolveRange(filter, customStart, customEnd, dateOverride) {
  if (dateOverride) {
    return {
      start: new Date(dateOverride.start),
      end: new Date(dateOverride.end),
      inclusive: false,
    }
  }

  const now = new Date()

  switch (filter) {
    case 'yesterday':
      return { start: startOfDay(subDays(now, 1)), end: startOfDay(now), inclusive: false }
    case 'week':
      return { start: subDays(now, 7) }
    case 'month':
      return { start: startOfMonth(now) }
    case 'year':
      return { start: startOfYear(now) }
    case 'custom': {
      if (!customStart) return { start: startOfDay(now) }
      const start = new Date(customStart)
      if (!customEnd) return { start }
      const end = new Date(customEnd)
      end.setHours(23, 59, 59, 999)
      return { start, end, inclusive: true }
    }
    default:
      return { start: startOfDay(now) }
  }
}

/**
 * A cache key that is unique per absolute window — so "Today" on Monday
 * never serves Tuesday's cached list.
 */
export function rangeKey(prefix, filter, customStart, customEnd, dateOverride) {
  const range = resolveRange(filter, customStart, customEnd, dateOverride)
  const start = range.start.toISOString()
  const end = range.end
    ? `${range.inclusive ? 'lte' : 'lt'}:${range.end.toISOString()}`
    : 'open'
  return `${prefix}:${start}:${end}`
}

function newBatchId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Records one checkout: every line the buyer took, in a single insert,
 * then decrements stock for the catalogued drugs (loose first, then cartons).
 *
 * A line is either a normal drug sale — `{ drug, sachets }` — or a custom
 * one — `{ custom: true, drug, name, amount }` — for the odd sale that is not
 * a whole number of sachets, such as a customer taking two doses out of a
 * sachet of ten. A custom line is linked to its drug and removes exactly the
 * value sold: `amount ÷ price_per_sachet` sachets come off the shelf.
 *
 * @param {Array<{drug, sachets} | {custom: true, drug, name, amount}>} lines
 */
export async function recordSales(lines) {
  if (!lines.length) throw new Error('Nothing to record.')

  // 1. work out the new stock for every drug BEFORE writing anything,
  //    so a line that would empty the shelf aborts the whole sale.
  const stockUpdates = new Map()
  for (const line of lines) {
    const drug = line.drug
    const sachets = line.custom ? doseSachets(drug, line.amount) : Number(line.sachets)

    if (line.custom && !(sachets > 0)) {
      throw new Error(
        `The amount for ${line.name || drug.name} is too small — it must be at least 1% of the sachet price.`
      )
    }

    const base = stockUpdates.get(drug.id) || {
      stock_cartons: drug.stock_cartons,
      stock_sachets: drug.stock_sachets,
    }
    const next = applySale({ ...drug, ...base }, sachets)
    if (!next) {
      const available = base.stock_cartons * (drug.sachets_per_carton || 1) + base.stock_sachets
      throw new Error(
        `Not enough stock for ${drug.name} — only ${formatSachets(available)} sachet${Number(available) === 1 ? '' : 's'} left.`
      )
    }
    stockUpdates.set(drug.id, next)
  }

  // 2. single insert for the whole checkout
  const batchId = newBatchId()
  const rows = lines.map(line => {
    const sachets = line.custom ? doseSachets(line.drug, line.amount) : Number(line.sachets)
    if (line.custom) {
      return {
        drug_id: line.drug.id,
        drug_name: line.name || line.drug.name,
        sachets,
        unit_price: line.drug.price_per_sachet,
        final_amount: Number(line.amount),
        batch_id: batchId,
      }
    }
    return {
      drug_id: line.drug.id,
      drug_name: line.drug.name,
      sachets,
      unit_price: line.drug.price_per_sachet,
      final_amount: Number(line.sachets) * Number(line.drug.price_per_sachet),
      batch_id: batchId,
    }
  })

  const { error } = await supabase.from('sales').insert(rows)
  if (error) throw new Error('Failed to record sale.')

  // 3. decrement stock
  for (const [drugId, stock] of stockUpdates) {
    const { error: stockError } = await supabase
      .from('drugs')
      .update({
        stock_cartons: stock.stock_cartons,
        stock_sachets: stock.stock_sachets,
        updated_at: new Date().toISOString(),
      })
      .eq('id', drugId)

    if (stockError) throw new Error('Sale recorded but stock update failed. Refresh and check stock.')
  }

  await afterWrite('sales', 'drugs')
}

export async function getSales(filter, customStart, customEnd, dateOverride) {
  const range = resolveRange(filter, customStart, customEnd, dateOverride)

  let query = supabase
    .from('sales')
    .select('*, drugs(icon)')
    .gte('timestamp', range.start.toISOString())
    .order('timestamp', { ascending: false })

  if (range.end) {
    query = range.inclusive
      ? query.lte('timestamp', range.end.toISOString())
      : query.lt('timestamp', range.end.toISOString())
  }

  const { data, error } = await query

  if (error) throw new Error('Failed to load sales.')
  return data
}

export async function resetAllData() {
  for (const table of ['sales', 'drugs', 'debtor_entries', 'debtors']) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw new Error(`Failed to reset ${table}.`)
  }
  await afterWrite('sales', 'drugs', 'debtors', 'debtor_entries')
}
