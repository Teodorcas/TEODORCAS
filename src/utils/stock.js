// Stock is tracked on two shelves: sealed cartons + loose sachets on the
// counter. Everything the UI shows or validates is derived from these.

export function totalSachets(drug) {
  const per = drug.sachets_per_carton || 1
  return (drug.stock_cartons || 0) * per + (drug.stock_sachets || 0)
}

/**
 * A dose sale is a fraction of a sachet: amount ÷ price per sachet.
 * Rounded to 2 decimals to match numeric(10,2); returns 0 when the amount is
 * too small to record at all.
 */
export function doseSachets(drug, amount) {
  const per = Number(drug?.price_per_sachet)
  if (!per || per <= 0) return 0
  return Math.round((Number(amount) / per) * 100) / 100
}

/**
 * Sachets are stored as decimals because a dose sale takes a fraction of a
 * sachet. This renders them without the float noise: 10 -> "10",
 * 9.8 -> "9.8", 9.87 -> "9.87".
 */
export function formatSachets(value) {
  const n = Math.round((Number(value) || 0) * 100) / 100
  return Object.is(n, -0) ? '0' : String(n)
}

/**
 * Applies a sale of `sachets` to a drug's stock.
 * Loose sachets go first; once they run out a carton is opened.
 * Returns the new stock, or null when there isn't enough.
 */
export function applySale(drug, sachets) {
  let loose = drug.stock_sachets || 0
  let cartons = drug.stock_cartons || 0
  const per = drug.sachets_per_carton || 1

  if (sachets <= loose) {
    return { stock_cartons: cartons, stock_sachets: loose - sachets }
  }

  const missing = sachets - loose
  const cartonsToOpen = Math.ceil(missing / per)
  if (cartonsToOpen > cartons) return null

  cartons -= cartonsToOpen
  loose = loose + cartonsToOpen * per - sachets
  return { stock_cartons: cartons, stock_sachets: loose }
}

export function priceOf(drug) {
  return Number(drug.price_per_sachet)
}

export function cartonPriceOf(drug) {
  return Number(drug.price_per_carton)
}

export function packLabel(drug) {
  return drug.pack_type === 'carton' ? 'Carton' : 'Sachet'
}

/** "5 cartons + 9.8 sachets" (or just "9.8 sachets" for loose drugs) */
export function stockLabel(drug) {
  const parts = []
  if (drug.pack_type === 'carton') {
    if (drug.stock_cartons > 0) parts.push(`${formatSachets(drug.stock_cartons)} carton${drug.stock_cartons === 1 ? '' : 's'}`)
    if (drug.stock_sachets > 0) parts.push(`${formatSachets(drug.stock_sachets)} sachet${drug.stock_sachets === 1 ? '' : 's'}`)
  } else {
    parts.push(`${formatSachets(drug.stock_sachets)} sachet${drug.stock_sachets === 1 ? '' : 's'}`)
  }
  if (parts.length === 0) parts.push('0 in stock')
  return parts.join(' + ')
}
