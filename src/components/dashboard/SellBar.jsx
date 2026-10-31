import { useState, useEffect, useRef } from 'react'
import { Search, X, ShoppingCart, Trash2, Plus } from 'lucide-react'
import { searchDrugs } from '../../api/drugs'
import { recordSales } from '../../api/sales'
import { formatCurrency } from '../../utils/formatters'
import { applySale, doseSachets, formatSachets } from '../../utils/stock'
import { getDrugIcon } from '../../utils/drugIcons'
import { ConfirmModal } from '../ui/ConfirmModal'
import { useToast } from '../../context/ToastContext'

let customSeq = 0

/**
 * One buyer, many items.
 *
 * Switch OFF: tap a drug in the search results and it goes straight into the
 * list at one sachet; the real count is typed in the small box inside the row.
 *
 * Switch ON (the Custom switch sits beside the search box): a description and
 * an amount field appear below with a ＋ button. The description is locked —
 * you search for the drug and tapping it drops the name in there instead of
 * adding a line. Type the amount, tap ＋, and the custom line joins the sale.
 *
 * A custom line is a fraction of a sachet — two doses out of a sachet of ten
 * is ₦200 of a ₦1,000 sachet — so it removes exactly that value from stock
 * and is linked to its drug. Both fields clear after each add, ready for the
 * next one. Toggling the switch off hides the fields and the button again.
 *
 * The panel never takes more than half the screen, so the dashboard stays
 * visible behind it.
 */
export function SellBar({ onSaleRecorded }) {
  const { showToast } = useToast()
  const [lines, setLines] = useState([]) // [{drug, qty}] or [{custom:true, drug, amount}]
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [custom, setCustom] = useState(false)
  const [customDrug, setCustomDrug] = useState(null)
  const [description, setDescription] = useState('')
  const [amountField, setAmountField] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [errorModal, setErrorModal] = useState({ open: false, message: '' })

  const submittingRef = useRef(false)
  const searchRef = useRef(null)
  const searchInputRef = useRef(null)
  const amountRef = useRef(null)
  const dropdownRef = useRef(null)
  const selectingRef = useRef(false)
  const qtyRefs = useRef({})

  useEffect(() => {
    if (selectingRef.current) { selectingRef.current = false; return }
    if (!query.trim()) { setResults([]); setShowDropdown(false); return }
    const timeout = setTimeout(async () => {
      try {
        const data = await searchDrugs(query)
        setResults(data)
        setShowDropdown(true)
      } catch { setResults([]) }
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function resetCustomFields() {
    setDescription('')
    setAmountField('')
    setCustomDrug(null)
  }

  /**
   * Switch OFF: the tap adds a line. Switch ON: the tap fills the locked
   * description box, and the drug is held for ＋ to pick up.
   */
  function selectDrug(drug) {
    selectingRef.current = true
    setShowDropdown(false)
    setResults([])
    setQuery('')

    if (custom) {
      setCustomDrug(drug)
      setDescription(drug.name)
      setTimeout(() => amountRef.current?.focus(), 0)
      return
    }

    if (lines.some(l => !l.custom && l.drug.id === drug.id)) {
      const el = qtyRefs.current[drug.id]
      el?.focus()
      el?.select?.()
      return
    }

    setLines(prev => [...prev, { key: drug.id, drug, qty: '1' }])
    searchInputRef.current?.focus()
  }

  function toggleCustom(next) {
    setCustom(next)
    if (!next) resetCustomFields()
  }

  /** Adds the custom line, then clears both fields for the next one. */
  function addCustom() {
    if (!canAddCustom) return
    customSeq += 1
    setLines(prev => [
      ...prev,
      { key: `c${customSeq}`, custom: true, drug: customDrug, name: customDrug.name, amount: String(parseInt(amountField)) },
    ])
    resetCustomFields()
    searchInputRef.current?.focus()
  }

  function setQty(key, value) {
    const clean = String(value).replace(/\D/g, '').slice(0, 4)
    setLines(prev => prev.map(l => (l.key === key ? { ...l, qty: clean } : l)))
  }

  function setLineAmount(key, value) {
    const clean = String(value).replace(/\D/g, '').slice(0, 7)
    setLines(prev => prev.map(l => (l.key === key ? { ...l, amount: clean } : l)))
  }

  function removeLine(key) {
    setLines(prev => prev.filter(l => l.key !== key))
  }

  const lineTotal = l =>
    l.custom ? (parseInt(l.amount) || 0) : (parseInt(l.qty) || 0) * Number(l.drug.price_per_sachet)

  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)
  const customCount = lines.filter(l => l.custom).length

  // ＋ stays grey until a drug is in the locked box and an amount is typed.
  const canAddCustom = Boolean(customDrug) && Boolean(description.trim()) && parseInt(amountField) > 0

  /** Returns an error message, or '' when everything checks out. */
  function validateLines() {
    if (lines.length === 0) return 'Add at least one item to this sale.'

    for (const line of lines) {
      if (line.custom) {
        const amount = parseInt(line.amount)
        if (!amount || amount < 1) return `Enter the amount for ${line.drug.name}.`
        if (!(doseSachets(line.drug, amount) > 0)) {
          return `The amount for ${line.drug.name} is too small — it must be at least 1% of the sachet price.`
        }
        continue
      }
      const qty = parseInt(line.qty)
      if (!qty || qty < 1) return `Enter the number of sachets of ${line.drug.name}.`
    }

    // Stock is checked cumulatively: two lines of the same drug share one shelf.
    const state = new Map()
    for (const line of lines) {
      const sachets = line.custom
        ? doseSachets(line.drug, parseInt(line.amount))
        : parseInt(line.qty)

      const base = state.get(line.drug.id) || {
        stock_cartons: line.drug.stock_cartons,
        stock_sachets: line.drug.stock_sachets,
      }
      const next = applySale({ ...line.drug, ...base }, sachets)
      if (!next) {
        const available = base.stock_cartons * (line.drug.sachets_per_carton || 1) + base.stock_sachets
        return `Not enough stock for ${line.drug.name} — only ${formatSachets(available)} sachet${Number(available) === 1 ? '' : 's'} left.`
      }
      state.set(line.drug.id, next)
    }

    return ''
  }

  function handleRegisterClick() {
    const problem = validateLines()
    if (problem) {
      setErrorModal({ open: true, message: problem })
      return
    }
    setConfirmOpen(true)
  }

  async function confirmSale() {
    if (submittingRef.current) return
    submittingRef.current = true
    setConfirmOpen(false)
    setLoading(true)

    const snapshot = lines.map(l =>
      l.custom
        ? { custom: true, drug: l.drug, name: l.name, amount: parseInt(l.amount) || 0 }
        : { drug: l.drug, sachets: parseInt(l.qty) }
    )

    try {
      await recordSales(snapshot)
      setLines([])
      setQuery('')
      setResults([])
      resetCustomFields()
      setCustom(false)
      showToast(snapshot.length === 1 ? 'Sale recorded successfully!' : `${snapshot.length} items recorded successfully!`)
      onSaleRecorded?.()
    } catch (err) {
      setErrorModal({ open: true, message: err.message || 'Failed to record sale.' })
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  return (
    <>
      <div className="bg-white rounded-card shadow-card flex flex-col">
        {/* Header + search + switch — never scrolls */}
        <div className="shrink-0 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Record a Sale</p>
            {lines.length > 0 && (
              <span className="text-[11px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full">
                {lines.length} item{lines.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="relative flex items-center gap-2" ref={searchRef}>
            <div className="flex flex-1 min-w-0 items-center gap-2 border-[1.5px] border-gray-200 rounded-btn px-3 bg-white focus-within:border-primary transition-colors">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={custom ? 'Search the drug bought...' : 'Search a drug...'}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 min-w-0 min-h-[42px] text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]); setShowDropdown(false) }} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>

            <CustomSwitch checked={custom} onChange={toggleCustom} />

            {showDropdown && results.length > 0 && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-card shadow-xl border border-gray-100 max-h-44 overflow-y-auto">
                {results.map(drug => {
                  const Icon = getDrugIcon(drug.icon)
                  const per = drug.sachets_per_carton || 1
                  const available = drug.stock_cartons * per + drug.stock_sachets
                  return (
                    <button
                      key={drug.id}
                      onClick={() => selectDrug(drug)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                          <Icon size={14} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{drug.name}</p>
                          <p className="text-[11px] text-gray-500">{formatSachets(available)} sachets left</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-accent font-sans shrink-0">{formatCurrency(drug.price_per_sachet)}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {showDropdown && results.length === 0 && query.trim() && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-card shadow-xl border border-gray-100 px-4 py-3">
                <p className="text-sm text-gray-500">No drugs found</p>
              </div>
            )}
          </div>
        </div>

        {/* Custom fields — only while the switch is on */}
        {custom && (
          <div className="shrink-0 px-4 pb-3 flex items-center gap-2">
            <div className="flex-1 min-w-0 min-h-[40px] px-3 flex items-center text-sm border-[1.5px] border-gray-200 rounded-btn bg-gray-100 text-gray-700">
              {description ? (
                <span className="truncate font-semibold">{description}</span>
              ) : (
                <span className="truncate text-gray-400">Search a drug to fill this</span>
              )}
            </div>

            <div className="flex items-center w-28 shrink-0 border-[1.5px] border-gray-200 rounded-btn px-2.5 focus-within:border-accent transition-colors bg-white">
              <span className="text-sm text-gray-400 shrink-0">₦</span>
              <input
                ref={amountRef}
                type="text"
                inputMode="numeric"
                placeholder="Amount"
                value={amountField}
                onChange={e => setAmountField(e.target.value.replace(/\D/g, '').slice(0, 7))}
                onKeyDown={e => { if (e.key === 'Enter') addCustom() }}
                className="w-full min-h-[40px] text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400 font-sans"
              />
            </div>

            <button
              type="button"
              onClick={addCustom}
              disabled={!canAddCustom}
              title="Add custom item"
              aria-label="Add custom item"
              className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-btn transition-colors ${
                canAddCustom
                  ? 'bg-accent text-white hover:brightness-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          </div>
        )}

        {/* Entries — capped at half the screen, scrolls inside itself */}
        <div
          className="overflow-y-auto px-4 pb-2 flex flex-col gap-2"
          style={{ maxHeight: '22vh', minHeight: lines.length ? '96px' : undefined }}
        >
          {lines.length === 0 ? (
            <div className="py-3 text-center">
              <p className="text-xs text-gray-400">
                {custom
                  ? 'Search the drug, type what was paid, then tap ＋.'
                  : 'Search a drug above and tap it — it is added to the sale right away.'}
              </p>
            </div>
          ) : (
            lines.map(line => line.custom ? (
              <div key={line.key} className="flex items-center gap-2 bg-orange-50 rounded-btn px-2.5 py-2 border border-orange-100">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
                  {(() => {
                    const Icon = getDrugIcon(line.drug.icon)
                    return <Icon size={16} className="text-accent" />
                  })()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[9px] font-black text-accent bg-white px-1.5 py-0.5 rounded uppercase shrink-0 border border-orange-100">
                      Custom
                    </span>
                    <p className="text-xs font-semibold text-gray-900 truncate">{line.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-gray-500 shrink-0">Amount</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={line.amount}
                      onChange={e => setLineAmount(line.key, e.target.value)}
                      className="w-20 h-7 px-1 text-center text-xs font-bold border-[1.5px] border-orange-200 rounded-md outline-none focus:border-accent bg-white text-gray-900"
                    />
                    <span className="text-[10px] text-gray-400 font-sans shrink-0">
                      −{formatSachets(doseSachets(line.drug, parseInt(line.amount) || 0))} sch
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => removeLine(line.key)}
                  title="Remove"
                  className="flex items-center justify-center w-7 h-7 rounded-md bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div key={line.key} className="flex items-center gap-2 bg-brand-bg rounded-btn px-2.5 py-2">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
                  {(() => {
                    const Icon = getDrugIcon(line.drug.icon)
                    return <Icon size={16} className="text-primary" />
                  })()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{line.drug.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-gray-500 font-sans shrink-0">{formatCurrency(line.drug.price_per_sachet)}/sch</span>
                    <input
                      ref={el => { qtyRefs.current[line.drug.id] = el }}
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={line.qty}
                      onChange={e => setQty(line.key, e.target.value)}
                      className="w-12 h-7 px-1 text-center text-xs font-bold border-[1.5px] border-gray-200 rounded-md outline-none focus:border-primary bg-white text-gray-900"
                    />
                    <span className="text-xs font-black text-accent font-sans">₦{lineTotal(line).toLocaleString('en-NG')}</span>
                  </div>
                </div>

                <button
                  onClick={() => removeLine(line.key)}
                  title="Remove"
                  className="flex items-center justify-center w-7 h-7 rounded-md bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Total + register — never scrolls */}
        <div className="shrink-0 border-t border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col shrink-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total</p>
              <p className="text-lg font-black text-accent font-sans leading-tight">{formatCurrency(grandTotal)}</p>
            </div>
            <button
              onClick={handleRegisterClick}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 min-h-[44px] bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-btn transition-colors disabled:opacity-50"
            >
              <ShoppingCart size={16} />
              {loading ? 'Recording...' : 'Register Sale'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm the whole checkout */}
      <ConfirmModal
        isOpen={confirmOpen}
        title="Confirm Sale"
        confirmLabel="Yes, Register Sale"
        onConfirm={confirmSale}
        onCancel={() => setConfirmOpen(false)}
        message=""
      >
        <div className="bg-brand-bg rounded-btn p-3 flex flex-col gap-1.5 text-sm -mt-2">
          {lines.map(line => (
            <div key={line.key} className="flex items-center justify-between gap-2">
              <span className="text-gray-600 truncate">
                {line.drug.name}
                <span className="text-gray-400 font-sans">
                  {line.custom
                    ? ` × ${formatSachets(doseSachets(line.drug, parseInt(line.amount) || 0))} sch`
                    : ` × ${parseInt(line.qty) || 0}`}
                </span>
              </span>
              <span className="font-medium text-gray-900 font-sans shrink-0">{formatCurrency(lineTotal(line))}</span>
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-gray-200 pt-1.5 mt-1">
            <span className="text-xs text-gray-500">
              {lines.length} item{lines.length === 1 ? '' : 's'}
              {customCount > 0 && ` · ${customCount} custom`}
            </span>
            <span className="font-semibold text-gray-700">Total</span>
          </div>
          <div className="flex justify-end">
            <span className="font-bold text-accent text-base font-sans">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </ConfirmModal>

      {/* Error Modal */}
      <ConfirmModal
        isOpen={errorModal.open}
        title="Cannot Record Sale"
        message={errorModal.message}
        confirmLabel="OK"
        onConfirm={() => setErrorModal({ open: false, message: '' })}
        onCancel={() => setErrorModal({ open: false, message: '' })}
      />
    </>
  )
}

/**
 * Sits beside the search box. Turning it on reveals the locked description,
 * the amount field and the ＋ button; turning it off hides them again.
 */
function CustomSwitch({ checked, onChange }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className={`text-[10px] font-black uppercase tracking-wide ${checked ? 'text-accent' : 'text-gray-400'}`}>
        Custom
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Custom sale"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-gray-200'}`}
      >
        <span
          className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  )
}
