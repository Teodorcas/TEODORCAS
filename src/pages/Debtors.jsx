import { useState, useMemo } from 'react'
import { LogOut, Search, Users, ArrowDownWideNarrow, ArrowUpNarrowWide, History, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchDebtors, fetchDebtorEntries, buildSummaries } from '../api/debtors'
import { useCollection } from '../hooks/useCollection'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { formatCurrency, formatDate, formatTime, formatRelativeDate } from '../utils/formatters'

const DEBTOR_DEPS = ['debtors']

export default function Debtors() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('alpha') // 'alpha' | 'desc' | 'asc'
  const [logoutModal, setLogoutModal] = useState(false)
  const [historyFor, setHistoryFor] = useState(null)

  const { data: debtors, loading, error } = useCollection('debtors', DEBTOR_DEPS, fetchDebtors)
  const { data: entries } = useCollection('debtor_entries', ['debtor_entries'], fetchDebtorEntries)

  const summaries = useMemo(
    () => buildSummaries(debtors || [], entries || []),
    [debtors, entries]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = summaries.filter(s => s.balance > 0)
    if (q) list = list.filter(s => s.name.toLowerCase().includes(q))
    return list
  }, [summaries, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sort === 'desc') return list.sort((a, b) => b.balance - a.balance)
    if (sort === 'asc') return list.sort((a, b) => a.balance - b.balance)
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered, sort])

  const totalOwed = filtered.reduce((sum, s) => sum + s.balance, 0)

  const filterButtons = [
    { key: 'desc', label: 'Up to Down', Icon: ArrowDownWideNarrow },
    { key: 'asc', label: 'Down to Up', Icon: ArrowUpNarrowWide },
  ]

  return (
    <>
      <TopBar
        title="Debtors"
        icon={Users}
        rightAction={
          <button
            onClick={() => setLogoutModal(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        }
      />

      <PageWrapper>
        <div className="flex flex-col gap-3">

          {/* Sticky: search + sort */}
          <div className="sticky top-14 z-20 bg-brand-bg pt-2 pb-1 flex flex-col gap-3">
            <div className="flex items-center gap-2 bg-white border-[1.5px] border-gray-200 rounded-btn px-3 focus-within:border-primary transition-colors">
              <Search size={15} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search debtor's name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 min-h-[40px] text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                  <span className="text-xs font-bold">CLEAR</span>
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {filterButtons.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setSort(prev => (prev === key ? 'alpha' : key))}
                  className={`flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-colors ${
                    sort === key
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary line */}
          {!loading && !error && sorted.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-400">
                {sorted.length} debtor{sorted.length === 1 ? '' : 's'}
                {sort !== 'alpha' && <span className="text-primary font-semibold"> · sorted by amount</span>}
              </p>
              <p className="text-xs font-bold text-gray-600">
                Total: <span className="text-accent font-sans">{formatCurrency(totalOwed)}</span>
              </p>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-card shadow-card p-3 h-16 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-card p-4 text-sm text-red-600 text-center">{error}</div>
          ) : sorted.length === 0 ? (
            <div className="bg-white rounded-card shadow-card p-8 flex flex-col items-center gap-2 text-center">
              <Users size={32} className="text-gray-200" />
              <p className="text-sm font-medium text-gray-500">
                {search ? 'No debtor matches your search' : 'No one owes money right now'}
              </p>
              <p className="text-xs text-gray-400">Record a debt from the dashboard</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sorted.map(debtor => (
                <button
                  key={debtor.id}
                  onClick={() => setHistoryFor(debtor)}
                  className="w-full bg-white rounded-card shadow-card px-3 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-primary">
                      {debtor.name.trim().charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate leading-tight">{debtor.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {debtor.entryCount} transaction{debtor.entryCount === 1 ? '' : 's'} · Last:{' '}
                      {formatRelativeDate(debtor.lastActivity)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-black text-accent font-sans">{formatCurrency(debtor.balance)}</p>
                      <p className="text-[10px] text-gray-400">owed</p>
                    </div>
                    <History size={14} className="text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PageWrapper>

      <BottomNav />

      {historyFor && (
        <DebtHistoryModal
          debtor={historyFor}
          entries={entries || []}
          onClose={() => setHistoryFor(null)}
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
    </>
  )
}

/* ─── Debt history ──────────────────────────────────────────────────────── */

function DebtHistoryModal({ debtor, entries, onClose }) {
  const mine = useMemo(
    () => entries.filter(e => e.debtor_id === debtor.id),
    [entries, debtor.id]
  )

  const paid = mine.filter(e => e.type === 'payment').reduce((s, e) => s + Number(e.amount), 0)

  // "Owed again" is only right when a payment already came BEFORE this debt
  // in time. Entries are newest-first, so a payment at a later index is an
  // earlier payment — this flags every debt that follows one.
  const hasEarlierPayment = new Array(mine.length).fill(false)
  let seenPayment = false
  for (let i = mine.length - 1; i >= 0; i--) {
    hasEarlierPayment[i] = seenPayment
    if (mine[i].type === 'payment') seenPayment = true
  }

  let lastDate = null

  return (
    <ConfirmModal
      isOpen
      title={debtor.name}
      message=""
      confirmLabel="Close"
      hideCancel
      onConfirm={onClose}
      onCancel={onClose}
    >
      <div className="flex flex-col gap-3 -mt-2">
        {/* Totals */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-brand-bg rounded-btn px-2 py-2 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Paid</p>
            <p className="text-xs font-black text-green-600 font-sans">{formatCurrency(paid)}</p>
          </div>
          <div className="bg-brand-bg rounded-btn px-2 py-2 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Balance</p>
            <p className="text-xs font-black text-accent font-sans">{formatCurrency(debtor.balance)}</p>
          </div>
        </div>

        {/* Ledger */}
        <div className="max-h-[45vh] overflow-y-auto flex flex-col gap-1.5">
          {mine.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No transactions yet</p>
          ) : (
            mine.map((entry, idx) => {
              const dateKey = formatRelativeDate(entry.timestamp)
              const showHeader = dateKey !== lastDate
              lastDate = dateKey
              const label =
                entry.type === 'payment'
                  ? 'Payment made'
                  : hasEarlierPayment[idx] ? 'Owed again' : 'Owed'

              return (
                <div key={entry.id}>
                  {showHeader && (
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide pt-2 pb-1">
                      {dateKey}
                    </p>
                  )}
                  <div className="flex items-center gap-2 bg-white rounded-btn px-3 py-2 border border-gray-100">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        entry.type === 'debt' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                      }`}
                    >
                      <span className="text-[13px] font-black">
                        {entry.type === 'debt' ? '+' : '−'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {label}
                        <span className="text-gray-400 font-normal"> · {formatTime(entry.timestamp)}</span>
                      </p>
                      {entry.note && (
                        <p className="text-[11px] text-gray-500 truncate">{entry.note}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-xs font-black font-sans ${entry.type === 'debt' ? 'text-orange-600' : 'text-green-600'}`}>
                        {entry.type === 'debt' ? '+' : '−'}{formatCurrency(entry.amount)}
                      </p>
                      <p className="text-[10px] text-gray-400 font-sans">
                        {formatCurrency(entry.balance_after)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          {mine.length > 0 && `Earliest record: ${formatDate(mine[mine.length - 1].timestamp)}`}
        </p>
      </div>
    </ConfirmModal>
  )
}
