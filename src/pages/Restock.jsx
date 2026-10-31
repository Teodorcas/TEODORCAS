import { useState } from 'react'
import { AlertTriangle, ShoppingBag, Bell, LogOut, Search, Package } from 'lucide-react'
import { updateDrugStock, fetchDrugs } from '../api/drugs'
import { useCollection } from '../hooks/useCollection'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { PageWrapper } from '../components/layout/PageWrapper'
import { RestockCard } from '../components/restock/RestockCard'
import { getQuantityStatus } from '../utils/quantityStatus'
import { totalSachets, stockLabel, packLabel, formatSachets } from '../utils/stock'
import { getDrugIcon } from '../utils/drugIcons'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { useToast } from '../context/ToastContext'

const DRUGS_DEPS = ['drugs']

function sortForRestock(list) {
  const statusOrder = { critical: 0, low: 1, healthy: 2 }
  return [...list].sort((a, b) => {
    const sa = getQuantityStatus(totalSachets(a), a.restock_threshold)
    const sb = getQuantityStatus(totalSachets(b), b.restock_threshold)
    const diff = statusOrder[sa] - statusOrder[sb]
    return diff !== 0 ? diff : totalSachets(a) - totalSachets(b)
  })
}

export default function Restock() {
  const [search, setSearch] = useState('')
  const [logoutModal, setLogoutModal] = useState(false)
  const [restockModal, setRestockModal] = useState({ open: false, drug: null })
  const [cartons, setCartons] = useState('')
  const [sachets, setSachets] = useState('')
  const [restockLoading, setRestockLoading] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { data, loading, error } = useCollection('drugs', DRUGS_DEPS, fetchDrugs)
  const drugs = sortForRestock(data || [])

  const filtered = search.trim()
    ? drugs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    : drugs

  const criticalCount = drugs.filter(d => totalSachets(d) === 0).length
  const lowCount = drugs.filter(d => {
    const qty = totalSachets(d)
    return qty > 0 && getQuantityStatus(qty, d.restock_threshold) !== 'healthy'
  }).length

  function openRestock(drug) {
    setRestockModal({ open: true, drug })
    setCartons('')
    setSachets('')
  }

  function closeRestock() {
    setRestockModal({ open: false, drug: null })
    setCartons('')
    setSachets('')
  }

  async function handleRestock() {
    const drug = restockModal.drug
    if (!drug) return

    const isCarton = drug.pack_type === 'carton'
    const addCartons = isCarton ? (parseInt(cartons) || 0) : 0
    const addSachets = parseInt(sachets) || 0

    if (addCartons < 0 || addSachets < 0) return showToast('Enter a valid quantity.', 'error')
    if (addCartons === 0 && addSachets === 0) return showToast('Enter how much you are adding.', 'error')

    const newCartons = drug.stock_cartons + addCartons
    const newSachets = drug.stock_sachets + addSachets

    if (newCartons < 0 || newSachets < 0) return showToast('Quantity cannot go below zero.', 'error')

    setRestockLoading(true)
    try {
      await updateDrugStock(drug.id, newCartons, newSachets)
      const added = addCartons * (drug.sachets_per_carton || 1) + addSachets
      showToast(`${drug.name} restocked with ${added} sachet${added === 1 ? '' : 's'}.`)
      closeRestock()
    } catch (err) {
      showToast(err.message || 'Failed to restock.', 'error')
    } finally {
      setRestockLoading(false)
    }
  }

  const drug = restockModal.drug
  const isCarton = drug?.pack_type === 'carton'
  const previewCartons = isCarton ? (parseInt(cartons) || 0) : 0
  const previewSachets = parseInt(sachets) || 0
  const previewTotal = drug
    ? (drug.stock_cartons + previewCartons) * (drug.sachets_per_carton || 1) + drug.stock_sachets + previewSachets
    : 0

  return (
    <>
      <TopBar
        title="Restock"
        icon={Bell}
        rightAction={
          <>
            {lowCount + criticalCount > 0 && (
              <span className="flex items-center justify-center min-w-[26px] h-6 px-2 bg-orange-100 text-orange-600 text-[11px] font-black rounded-full">
                {lowCount + criticalCount}
              </span>
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

          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-card shadow-card p-3 h-14 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-card p-4 text-sm text-red-600 text-center">{error}</div>
          ) : (
            <>
              {/* Sticky header: Stat Cards + Search */}
              <div className="sticky top-14 z-20 bg-brand-bg pt-2 pb-1 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-500 rounded-card shadow-card p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <AlertTriangle size={16} className="text-white" />
                      </div>
                      <p className="text-xs font-medium text-white/80">Low Stock</p>
                    </div>
                    <p className="text-2xl font-black text-white">{lowCount}</p>
                    <p className="text-[11px] text-white/60">Need Restocking</p>
                  </div>

                  <div className="bg-red-600 rounded-card shadow-card p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <ShoppingBag size={16} className="text-white" />
                      </div>
                      <p className="text-xs font-medium text-white/80">Out of Stock</p>
                    </div>
                    <p className="text-2xl font-black text-white">{criticalCount}</p>
                    <p className="text-[11px] text-white/60">Completely Empty</p>
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
              {filtered.length === 0 ? (
                <div className="bg-white rounded-card shadow-card p-8 flex flex-col items-center gap-2 text-center">
                  <Package size={28} className="text-gray-200" />
                  <p className="text-sm font-semibold text-gray-500">
                    {search ? 'No drugs match your search' : 'All drugs are fully stocked'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filtered.map(item => (
                    <RestockCard key={item.id} drug={item} onRestock={openRestock} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PageWrapper>

      <BottomNav />

      {/* Restock Modal */}
      <ConfirmModal
        isOpen={restockModal.open}
        title="Restock Drug"
        message=""
        confirmLabel={restockLoading ? 'Restocking...' : 'Confirm Restock'}
        onConfirm={handleRestock}
        onCancel={closeRestock}
      >
        {drug && (
          <div className="flex flex-col gap-3 -mt-1">
            <div className="bg-brand-bg rounded-btn p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg shrink-0 bg-primary-light flex items-center justify-center">
                {(() => {
                  const Icon = getDrugIcon(drug.icon)
                  return <Icon size={18} className="text-primary" />
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{drug.name}</p>
                <p className="text-xs text-gray-500">
                  In store: <span className="font-bold text-gray-700">{stockLabel(drug)}</span>
                  <span className="ml-1 text-gray-400">· {packLabel(drug)}</span>
                </p>
              </div>
            </div>

            <div className={`flex gap-3 ${isCarton ? '' : ''}`}>
              {isCarton && (
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cartons to add</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    value={cartons}
                    onChange={e => setCartons(e.target.value)}
                    min="1"
                    disabled={restockLoading}
                    className="w-full min-h-[44px] px-4 border-[1.5px] border-gray-200 rounded-btn text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sachets to add</label>
                <input
                  type="number"
                  placeholder={isCarton ? 'e.g. 3' : 'e.g. 50'}
                  value={sachets}
                  onChange={e => setSachets(e.target.value)}
                  min="1"
                  disabled={restockLoading}
                  className="w-full min-h-[44px] px-4 border-[1.5px] border-gray-200 rounded-btn text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {(previewCartons > 0 || previewSachets > 0) && (
              <p className="text-xs text-gray-400">
                New total:{' '}
                <span className="font-bold text-primary">
                  {formatSachets(previewTotal)} sachets
                </span>
                {isCarton && previewCartons > 0 && (
                  <span className="text-gray-400"> ({drug.stock_cartons + previewCartons} cartons)</span>
                )}
              </p>
            )}
          </div>
        )}
      </ConfirmModal>

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
