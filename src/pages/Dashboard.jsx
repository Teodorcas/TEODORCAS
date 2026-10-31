import { useState, useCallback } from 'react'
import { LogOut, ShoppingCart, TrendingUp, TrendingDown, Minus, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSales, rangeKey } from '../api/sales'
import { useCollection } from '../hooks/useCollection'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { SaleRecord } from '../components/dashboard/SaleRecord'
import { FilterTabs } from '../components/dashboard/FilterTabs'
import { SellBar } from '../components/dashboard/SellBar'
import { AutoFitText } from '../components/ui/AutoFitText'
import { formatCurrency, formatDate, formatRelativeDate } from '../utils/formatters'
import { ConfirmModal } from '../components/ui/ConfirmModal'

const SALES_DEPS = ['sales']

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning 👋'
  if (h < 17) return 'Good afternoon 👋'
  return 'Good evening 👋'
}

function getPrevPeriodDates(filter) {
  const now = new Date()
  let start, end
  switch (filter) {
    case 'today': {
      end = new Date(now)
      end.setHours(0, 0, 0, 0)
      start = new Date(end)
      start.setDate(start.getDate() - 1)
      break
    }
    case 'yesterday': {
      end = new Date(now)
      end.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() - 1)
      start = new Date(end)
      start.setDate(start.getDate() - 1)
      break
    }
    case 'week': {
      end = new Date(now)
      end.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() - 7)
      start = new Date(end)
      start.setDate(start.getDate() - 7)
      break
    }
    case 'month': {
      end = new Date(now.getFullYear(), now.getMonth(), 1)
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1)
      break
    }
    case 'year': {
      end = new Date(now.getFullYear(), 0, 1)
      start = new Date(end.getFullYear() - 1, 0, 1)
      break
    }
    default:
      return null
  }
  return { start: start.toISOString(), end: end.toISOString() }
}

export default function Dashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [logoutModal, setLogoutModal] = useState(false)
  const [sellBarOpen, setSellBarOpen] = useState(false)
  const [sharedFontSize, setSharedFontSize] = useState(null)

  const rangeReady = filter !== 'custom' || (Boolean(customStart) && Boolean(customEnd))
  const prevRange = filter === 'custom' ? null : getPrevPeriodDates(filter)

  // Both lists are read straight from the mirror cache on paint, then
  // validated against sync_state underneath.
  const salesName = rangeReady ? rangeKey('sales', filter, customStart, customEnd) : 'sales:waiting'
  const prevName = rangeReady
    ? (prevRange ? rangeKey('sales-prev', filter, customStart, customEnd, prevRange) : 'sales-prev:none')
    : 'sales-prev:waiting'

  const salesFetcher = useCallback(
    () => (rangeReady ? getSales(filter, customStart, customEnd) : Promise.resolve([])),
    [rangeReady, filter, customStart, customEnd]
  )

  const prevFetcher = useCallback(
    () => (rangeReady && prevRange ? getSales(filter, customStart, customEnd, prevRange) : Promise.resolve([])),
    [rangeReady, prevRange, filter, customStart, customEnd]
  )

  const { data: sales, loading, error } = useCollection(
    salesName,
    rangeReady ? SALES_DEPS : [],
    salesFetcher
  )
  const { data: prevSales } = useCollection(
    prevName,
    rangeReady && prevRange ? SALES_DEPS : [],
    prevFetcher
  )

  const list = sales || []
  const previous = prevSales || []

  const totalSold = list.length
  const totalIncome = list.reduce((sum, s) => sum + Number(s.final_amount), 0)
  const prevTotalSold = previous.length
  const prevTotalIncome = previous.reduce((sum, s) => sum + Number(s.final_amount), 0)

  function getChange(current, previousValue) {
    if (previousValue === 0) return current > 0 ? { pct: 100, dir: 'up' } : { pct: 0, dir: 'same' }
    const change = ((current - previousValue) / previousValue) * 100
    if (change > 0) return { pct: Math.round(change), dir: 'up' }
    if (change < 0) return { pct: Math.round(Math.abs(change)), dir: 'down' }
    return { pct: 0, dir: 'same' }
  }

  function ChangeBadge({ change }) {
    if (filter === 'custom') return null
    const Icon = change.dir === 'up' ? TrendingUp : change.dir === 'down' ? TrendingDown : Minus
    const color = change.dir === 'up' ? 'text-green-300' : change.dir === 'down' ? 'text-orange-300' : 'text-white'
    const label = change.dir === 'same' ? 'No change' : `${change.pct}%`
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${color}`}>
        <Icon size={10} />
        {label}
      </span>
    )
  }

  function groupSalesByDate(salesList) {
    const groups = []
    let currentDate = null
    for (const sale of salesList) {
      const dateKey = new Date(sale.timestamp).toDateString()
      if (dateKey !== currentDate) {
        currentDate = dateKey
        groups.push({ type: 'date', date: sale.timestamp, key: `date-${dateKey}` })
      }
      groups.push({ type: 'sale', data: sale, key: sale.id })
    }
    return groups
  }

  const groupedSales = groupSalesByDate(list)

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Fixed Top Bar */}
      <TopBar
        title={getGreeting()}
        subtitle="TEODORCAS"
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

      {/* Scrollable content — padded top for topbar, bottom for sell button + bottom nav */}
      <div className="max-w-[480px] mx-auto px-4 pt-16 pb-40 flex flex-col gap-4">

        {/* Sticky header: Stat Cards + Filter */}
        <div className="sticky top-14 z-20 bg-brand-bg pt-2 pb-1 flex flex-col gap-4">
          <div className="grid gap-3 [grid-template-columns:2fr_3fr]">
            <div className="bg-slate-dark rounded-card shadow-card p-4 flex flex-col gap-2 overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <ShoppingCart size={16} className="text-white" />
                </div>
                <p className="text-xs font-medium text-white/80">Total Sold</p>
              </div>
              <AutoFitText className="font-black text-white w-full" style={{ fontFamily: "'Poppins', 'Noto Sans', sans-serif" }} fontSize={sharedFontSize} maxFontSize={32}>{totalSold}</AutoFitText>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-white/60">Items</p>
                <ChangeBadge change={getChange(totalSold, prevTotalSold)} />
              </div>
            </div>

            <div className="bg-primary rounded-card shadow-card p-4 flex flex-col gap-2 overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingUp size={16} className="text-white" />
                </div>
                <p className="text-xs font-medium text-white/80">Total Income</p>
              </div>
              <AutoFitText className="font-black text-white w-full" style={{ fontFamily: "'Poppins', 'Noto Sans', sans-serif" }} onFit={setSharedFontSize} maxFontSize={32}>{formatCurrency(totalIncome)}</AutoFitText>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-white/60">Total Earned</p>
                <ChangeBadge change={getChange(totalIncome, prevTotalIncome)} />
              </div>
            </div>
          </div>

          <FilterTabs active={filter} onChange={setFilter} />

          {filter === 'custom' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border-[1.5px] border-gray-200 rounded-btn text-sm outline-none focus:border-primary bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border-[1.5px] border-gray-200 rounded-btn text-sm outline-none focus:border-primary bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* SALES RECORD */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Sales Record</h2>
            <p className="text-xs text-gray-400">{formatDate(new Date().toISOString())}</p>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-card shadow-card p-4 h-16 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-card p-4 text-sm text-red-600 text-center">
              {error}
            </div>
          ) : list.length === 0 ? (
            <div className="bg-white rounded-card shadow-card p-8 flex flex-col items-center gap-2 text-center">
              <ShoppingCart size={32} className="text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No sales recorded for this period</p>
              <p className="text-xs text-gray-400">Tap "Record a Sale" below to get started</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {groupedSales.map(item =>
                item.type === 'date' ? (
                  <div key={item.key} className="flex items-center gap-2 pt-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{formatRelativeDate(item.date)}</p>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                ) : (
                  <SaleRecord key={item.key} sale={item.data} showPrice={true} />
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* FIXED BOTTOM — Sell bar + BottomNav, never scrolls */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="max-w-[480px] mx-auto pointer-events-auto">

          {/* Sell Bar slides up above nav when open */}
          {sellBarOpen && (
            <div className="bg-[#F5F6FA] border-t border-gray-200 px-4 pt-3 pb-2 shadow-lg">
              <SellBar onSaleRecorded={() => setSellBarOpen(false)} />
            </div>
          )}

          {/* Record a Sale toggle button */}
          <div className="bg-white border-t border-gray-100 px-4 py-2">
            <button
              onClick={() => setSellBarOpen(prev => !prev)}
              className={`w-full flex items-center justify-center gap-2 min-h-[44px] rounded-btn text-sm font-semibold transition-colors ${
                sellBarOpen
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              <ShoppingCart size={16} />
              {sellBarOpen ? 'Close' : 'Record a Sale'}
            </button>
          </div>

          {/* Original BottomNav */}
          <BottomNav inline />
        </div>
      </div>

      <ConfirmModal
        isOpen={logoutModal}
        title="Log Out"
        message="Are you sure you want to log out of TEODORCAS?"
        confirmLabel="Log Out"
        onConfirm={handleLogout}
        onCancel={() => setLogoutModal(false)}
      />
    </div>
  )
}
