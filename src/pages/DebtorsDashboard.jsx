import { useState, useMemo } from 'react'
import { LogOut, Home, UserPlus, HandCoins, Search, Users, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fetchDebtors, fetchDebtorEntries, buildSummaries, recordDebt, recordPayment } from '../api/debtors'
import { useCollection } from '../hooks/useCollection'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { PharmacistCash } from '../components/illustrations/PharmacistCash'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AutoFitText } from '../components/ui/AutoFitText'
import { formatCurrency } from '../utils/formatters'

const DEBTOR_DEPS = ['debtors']

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning 👋'
  if (h < 17) return 'Good afternoon 👋'
  return 'Good evening 👋'
}

const inputClass =
  'w-full min-h-[42px] px-4 border-[1.5px] border-gray-200 rounded-btn text-sm outline-none focus:border-primary bg-white text-gray-900 placeholder-gray-400 transition-colors'
const labelClass = 'text-xs font-semibold text-gray-500 uppercase tracking-wide'

export default function DebtorsDashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [logoutModal, setLogoutModal] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const { data: debtors } = useCollection('debtors', DEBTOR_DEPS, fetchDebtors)
  const { data: entries } = useCollection('debtor_entries', ['debtor_entries'], fetchDebtorEntries)

  const summaries = useMemo(
    () => buildSummaries(debtors || [], entries || []),
    [debtors, entries]
  )
  const active = summaries.filter(s => s.balance > 0)
  const totalOwed = active.reduce((sum, s) => sum + s.balance, 0)

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <TopBar
        title={getGreeting()}
        subtitle="TEODORCAS · Debtors"
        icon={Home}
        rightAction={
          <button
            onClick={() => setLogoutModal(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        }
      />

      <div className="w-full max-w-[480px] mx-auto px-4 pt-16 pb-40 flex-1 flex flex-col gap-4">
        {/* Stat cards */}
        <div className="grid [grid-template-columns:2fr_3fr] gap-3 pt-2">
          <div className="bg-slate-dark rounded-card shadow-card p-4 flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Users size={16} className="text-white" />
              </div>
              <p className="text-xs font-medium text-white/80">Total Debtors</p>
            </div>
            <AutoFitText
              className="font-black text-white w-full"
              style={{ fontFamily: "'Poppins', 'Noto Sans', sans-serif" }}
              maxFontSize={32}
            >
              {active.length}
            </AutoFitText>
            <p className="text-xs text-white/60">People owing</p>
          </div>

          <div className="bg-primary rounded-card shadow-card p-4 flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <HandCoins size={16} className="text-white" />
              </div>
              <p className="text-xs font-medium text-white/80">Total Owed</p>
            </div>
            <AutoFitText
              className="font-black text-white w-full"
              style={{ fontFamily: "'Poppins', 'Noto Sans', sans-serif" }}
              maxFontSize={32}
            >
              {formatCurrency(totalOwed)}
            </AutoFitText>
            <p className="text-xs text-white/60">Outstanding debt</p>
          </div>
        </div>

        {/* The two actions are docked above the bottom nav, so this middle
            space carries the illustration and the empty state instead. */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-2">
          <PharmacistCash className="w-full max-w-[300px] h-auto" />
          {active.length === 0 && (
            <div className="flex flex-col items-center gap-1 text-center px-4 -mt-1">
              <p className="text-sm font-medium text-gray-500">No one owes money right now</p>
              <p className="text-xs text-gray-400">Tap "Record Debt" to add a customer's debt</p>
            </div>
          )}
        </div>
      </div>

      {/* FIXED BOTTOM — the two actions dock above the nav and never scroll,
          the same shape as the Record a Sale bar on the selling dashboard. */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="max-w-[480px] mx-auto pointer-events-auto">
          <div className="bg-white border-t border-gray-100 px-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRecordOpen(true)}
                className="min-h-[52px] flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-card transition-colors"
              >
                <UserPlus size={18} />
                Record Debt
              </button>
              <button
                onClick={() => setPayOpen(true)}
                className="min-h-[52px] flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-white text-sm font-bold rounded-card transition-colors"
              >
                <HandCoins size={18} />
                Pay Debt
              </button>
            </div>
          </div>

          <BottomNav inline />
        </div>
      </div>

      {recordOpen && (
        <RecordDebtModal
          existingNames={summaries.map(s => s.name)}
          onClose={() => setRecordOpen(false)}
          showToast={showToast}
        />
      )}

      {payOpen && (
        <PayDebtModal
          debtors={active}
          onClose={() => setPayOpen(false)}
          showToast={showToast}
        />
      )}

      <ConfirmModal
        isOpen={logoutModal}
        title="Log Out"
        message="Are you sure you want to log out of TEODORCAS?"
        confirmLabel="Log Out"
        onConfirm={() => { logout(); navigate('/', { replace: true }) }}
        onCancel={() => setLogoutModal(false)}
      />
    </div>
  )
}

/* ─── Record a new (or repeat) debt ─────────────────────────────────────── */

function RecordDebtModal({ existingNames, onClose, showToast }) {
  const [name, setName] = useState('')
  const [drugs, setDrugs] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const trimmed = name.trim()
  const isExisting = existingNames.some(n => n.trim().toLowerCase() === trimmed.toLowerCase())
  const value = parseFloat(amount) || 0

  const ready = trimmed.length > 0 && drugs.trim().length > 0 && value > 0

  async function handleConfirm() {
    if (!ready) {
      showToast('Fill in the name, drugs bought and amount.', 'error')
      return
    }
    setSaving(true)
    try {
      const result = await recordDebt({ debtorName: trimmed, amount: value, note: drugs.trim() })
      showToast(`${trimmed} now owes ${formatCurrency(result.balance)}.`)
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to record debt.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ConfirmModal
      isOpen
      title="Record Debt"
      confirmLabel={saving ? 'Recording...' : 'Confirm & Record'}
      onConfirm={handleConfirm}
      onCancel={onClose}
      message=""
    >
      <div className="flex flex-col gap-3 -mt-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Debtor Name</label>
          <input
            type="text"
            placeholder="e.g. Chidi Okafor"
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputClass}
            disabled={saving}
          />
          {isExisting && (
            <p className="text-[11px] text-primary font-medium">
              Existing debtor — this will be added to their history.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Drugs Bought</label>
          <textarea
            placeholder="e.g. Panadol 2 sachets, Amoxyl 1 carton"
            value={drugs}
            onChange={e => setDrugs(e.target.value)}
            rows={2}
            disabled={saving}
            className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-btn text-sm outline-none focus:border-primary bg-white text-gray-900 placeholder-gray-400 transition-colors resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Total Amount (₦)</label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="e.g. 3000"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="1"
            disabled={saving}
            className={inputClass}
          />
        </div>

        {ready && (
          <div className="bg-brand-bg rounded-btn px-3 py-2.5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{trimmed}</p>
              <p className="text-[11px] text-gray-500 truncate">{drugs.trim()}</p>
            </div>
            <p className="text-sm font-black text-accent font-sans shrink-0">{formatCurrency(value)}</p>
          </div>
        )}
      </div>
    </ConfirmModal>
  )
}

/* ─── Clear a debtor: pay down, or owe again ────────────────────────────── */

function PayDebtModal({ debtors, onClose, showToast }) {
  const [step, setStep] = useState('search')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [direction, setDirection] = useState('payment') // 'payment' | 'debt'
  const [amount, setAmount] = useState('')
  const [drugs, setDrugs] = useState('')
  const [saving, setSaving] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return debtors.slice(0, 8)
    return debtors.filter(d => d.name.toLowerCase().includes(q))
  }, [debtors, query])

  const value = parseFloat(amount) || 0
  const isPayment = direction === 'payment'
  const newBalance = selected
    ? isPayment
      ? selected.balance - value
      : selected.balance + value
    : 0
  const overpay = isPayment && value > selected?.balance
  const ready = value > 0 && !overpay && (isPayment || drugs.trim().length > 0)

  function pick(debtor) {
    setSelected(debtor)
    setDirection('payment')
    setAmount('')
    setDrugs('')
    setStep('detail')
  }

  async function handleConfirm() {
    if (!selected) return
    if (value <= 0) { showToast('Enter an amount.', 'error'); return }
    if (overpay) { showToast('Payment exceeds the amount owed.', 'error'); return }
    if (!isPayment && !drugs.trim()) { showToast('Enter what the customer bought.', 'error'); return }

    setSaving(true)
    try {
      if (isPayment) {
        const balance = await recordPayment({ debtorId: selected.id, amount: value })
        showToast(
          balance === 0
            ? `${selected.name} has cleared their debt.`
            : `${selected.name} paid ${formatCurrency(value)} — ${formatCurrency(balance)} left.`
        )
      } else {
        const result = await recordDebt({
          debtorId: selected.id,
          debtorName: selected.name,
          amount: value,
          note: drugs.trim(),
        })
        showToast(`${selected.name} now owes ${formatCurrency(result.balance)}.`)
      }
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to record.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ConfirmModal
      isOpen
      title={step === 'search' ? 'Clear a Debtor' : 'Debtor Balance'}
      confirmLabel={
        step === 'search'
          ? 'Continue'
          : saving
            ? 'Saving...'
            : isPayment
              ? 'Confirm Payment'
              : 'Confirm Debt'
      }
      onConfirm={
        step === 'search'
          ? () => {
              if (results.length === 1) { pick(results[0]); return }
              if (results.length === 0) {
                showToast(query.trim() ? 'No debtor matches that name.' : 'There are no debtors yet.', 'error')
                return
              }
              showToast('Tap a debtor from the list to select them.', 'error')
            }
          : handleConfirm
      }
      onCancel={onClose}
      message=""
    >
      <div className="flex flex-col gap-3 -mt-2">
        {step === 'search' && (
          <>
            <div className="flex items-center gap-2 border-[1.5px] border-gray-200 rounded-btn px-3 bg-white focus-within:border-primary transition-colors">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search debtor's name..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 min-h-[42px] text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"
              />
            </div>

            <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 -mx-1 px-1">
              {results.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {query.trim() ? 'No debtor matches that name' : 'No debtors yet'}
                </p>
              ) : (
                results.map(debtor => (
                  <button
                    key={debtor.id}
                    onClick={() => pick(debtor)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-brand-bg rounded-btn hover:bg-primary-light transition-colors text-left"
                  >
                    <span className="text-sm font-semibold text-gray-900 truncate">{debtor.name}</span>
                    <span className="text-sm font-bold text-accent font-sans shrink-0">
                      {formatCurrency(debtor.balance)}
                    </span>
                  </button>
                ))
              )}
            </div>

            {results.length > 0 && (
              <p className="text-[11px] text-gray-400 text-center">Pick a debtor to see their balance</p>
            )}
          </>
        )}

        {step === 'detail' && selected && (
          <>
            <button
              onClick={() => setStep('search')}
              className="self-start flex items-center gap-1 text-xs font-semibold text-primary"
              disabled={saving}
            >
              <ArrowLeft size={13} />
              Search again
            </button>

            <div className="bg-brand-bg rounded-btn p-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{selected.name}</p>
                <p className="text-[11px] text-gray-500">Amount owed</p>
              </div>
              <p className="text-lg font-black text-accent font-sans shrink-0">
                {formatCurrency(selected.balance)}
              </p>
            </div>

            {/* Pay or owe again */}
            <div className="flex gap-2">
              <button
                onClick={() => setDirection('payment')}
                disabled={saving}
                className={`flex-1 min-h-[40px] rounded-btn border-[1.5px] font-semibold text-sm transition-colors ${
                  isPayment
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                }`}
              >
                Pay Debt
              </button>
              <button
                onClick={() => setDirection('debt')}
                disabled={saving}
                className={`flex-1 min-h-[40px] rounded-btn border-[1.5px] font-semibold text-sm transition-colors ${
                  !isPayment
                    ? 'bg-accent border-accent text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-accent hover:text-accent'
                }`}
              >
                Owe Again
              </button>
            </div>

            {!isPayment && (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Drugs Bought</label>
                <textarea
                  placeholder="e.g. Benylin 4 sachets"
                  value={drugs}
                  onChange={e => setDrugs(e.target.value)}
                  rows={2}
                  disabled={saving}
                  className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-btn text-sm outline-none focus:border-primary bg-white text-gray-900 placeholder-gray-400 transition-colors resize-none"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                {isPayment ? 'Amount Paid (₦)' : 'Amount Owed Again (₦)'}
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder={isPayment ? `Up to ${Math.floor(selected.balance)}` : 'e.g. 1500'}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="1"
                disabled={saving}
                className={inputClass}
              />
              {isPayment && (
                <button
                  onClick={() => setAmount(String(Math.floor(selected.balance)))}
                  disabled={saving}
                  className="self-start text-[11px] font-semibold text-primary hover:underline"
                >
                  Pay in full ({formatCurrency(selected.balance)})
                </button>
              )}
            </div>

            {value > 0 && !overpay && (
              <div className="bg-brand-bg rounded-btn px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {isPayment ? `${selected.name} pays` : `${selected.name} owes more`}
                </span>
                <span className="text-sm font-black text-accent font-sans">
                  {formatCurrency(value)}
                </span>
              </div>
            )}

            {value > 0 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                <span className="text-xs font-semibold text-gray-600">New balance</span>
                <span className="text-base font-black text-gray-900 font-sans">
                  {formatCurrency(Math.max(0, newBalance))}
                </span>
              </div>
            )}

            {overpay && (
              <p className="text-xs text-red-500 font-medium">
                Payment is more than the {formatCurrency(selected.balance)} owed.
              </p>
            )}
          </>
        )}
      </div>
    </ConfirmModal>
  )
}
