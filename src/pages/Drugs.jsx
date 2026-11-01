import { useState, useMemo } from 'react'
import { Plus, Search, Package, Boxes, TrendingUp, LogOut, Pill } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchDrugs } from '../api/drugs'
import { useCollection } from '../hooks/useCollection'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { PageWrapper } from '../components/layout/PageWrapper'
import { DrugCard } from '../components/drug/DrugCard'
import { AutoFitText } from '../components/ui/AutoFitText'
import { formatCurrency } from '../utils/formatters'
import { totalSachets, formatSachets } from '../utils/stock'
import { ConfirmModal } from '../components/ui/ConfirmModal'

const DRUGS_DEPS = ['drugs']

export default function Drugs() {
  const { isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [logoutModal, setLogoutModal] = useState(false)
  const [sharedFontSize, setSharedFontSize] = useState(null)

  const { data: drugs, loading, error } = useCollection('drugs', DRUGS_DEPS, fetchDrugs)

  const list = drugs || []

  const filtered = useMemo(() => {
    if (!search.trim()) return list
    return list.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
  }, [list, search])

  const totalValue = list.reduce(
    (sum, d) => sum + totalSachets(d) * Number(d.price_per_sachet),
    0
  )
  const totalQuantity = list.reduce((sum, d) => sum + totalSachets(d), 0)
  const inStockCount = list.filter(d => totalSachets(d) > 0).length

  return (
    <>
      <TopBar
        title="Drugs"
        icon={Package}
        rightAction={
          <>
            {isAdmin && (
              <button
                onClick={() => navigate('/drugs/add')}
                aria-label="Register a drug"
                title="Register a drug"
                className="flex items-center justify-center gap-1.5 min-h-[34px] px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-btn hover:bg-primary-dark transition-colors"
              >
                <Plus size={14} />
              </button>
            )}
            <button
              onClick={() => setLogoutModal(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </>
        }
      />

      <PageWrapper>
        <div className="flex flex-col gap-3">

          {/* Sticky header: Stat Cards + Search */}
          <div className="sticky top-14 z-20 bg-brand-bg pt-2 pb-1 flex flex-col gap-3">
            <div className="grid [grid-template-columns:2fr_3fr] gap-3">
              <div className="bg-slate-dark rounded-card shadow-card p-4 flex flex-col gap-2 overflow-hidden">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Boxes size={16} className="text-white" />
                  </div>
                  <p className="text-xs font-medium text-white/80">Total Drugs</p>
                </div>
                <AutoFitText className="font-black text-white w-full" style={{ fontFamily: "'Poppins', 'Noto Sans', sans-serif" }} fontSize={sharedFontSize} maxFontSize={32}>{inStockCount}/{list.length}</AutoFitText>
                <p className="text-[11px] text-white/60">{formatSachets(totalQuantity)} sachets · In Stock</p>
              </div>

              <div className="bg-primary rounded-card shadow-card p-4 flex flex-col gap-2 overflow-hidden">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <TrendingUp size={16} className="text-white" />
                  </div>
                  <p className="text-xs font-medium text-white/80">Stock Value</p>
                </div>
                <AutoFitText className="font-black text-white w-full" style={{ fontFamily: "'Poppins', 'Noto Sans', sans-serif" }} onFit={setSharedFontSize} maxFontSize={32}>{formatCurrency(totalValue)}</AutoFitText>
                <p className="text-[11px] text-white/60">Total Worth</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white border-[1.5px] border-gray-200 rounded-btn px-3 focus-within:border-primary transition-colors">
              <Search size={15} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search drugs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 min-h-[40px] text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Drug List */}
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-card shadow-card p-3 h-16 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-card p-4 text-sm text-red-600 text-center">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-card shadow-card p-8 flex flex-col items-center gap-2 text-center">
              <Pill size={28} className="text-gray-200" />
              <p className="text-sm font-semibold text-gray-500">
                {search ? 'No drugs match your search' : 'No drugs registered yet'}
              </p>
              {isAdmin && !search && (
                <p className="text-xs text-gray-400">Tap "+" to get started</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(drug => (
                <DrugCard
                  key={drug.id}
                  drug={drug}
                  showEdit={isAdmin}
                  onEdit={d => navigate(`/drugs/edit/${d.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </PageWrapper>

      <BottomNav />

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
