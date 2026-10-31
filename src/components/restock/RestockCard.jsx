import { getQuantityStatus } from '../../utils/quantityStatus'
import { getDrugIcon } from '../../utils/drugIcons'
import { totalSachets, stockLabel } from '../../utils/stock'

export function RestockCard({ drug, onRestock }) {
  const available = totalSachets(drug)
  const status = getQuantityStatus(available, drug.restock_threshold)
  const isCritical = status === 'critical'
  const isLow = status === 'low'
  const Icon = getDrugIcon(drug.icon)

  return (
    <div className="bg-white rounded-card shadow-card px-3 py-2.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg shrink-0 bg-primary-light flex items-center justify-center">
        <Icon size={18} className="text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm truncate leading-tight">{drug.name}</p>
        <p className={`text-xs font-black truncate mt-0.5 ${isCritical ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-green-600'}`}>
          {stockLabel(drug)}
        </p>
      </div>

      <button
        onClick={() => onRestock(drug)}
        className="shrink-0 min-h-[32px] px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-btn hover:bg-primary-dark transition-colors"
      >
        Restock
      </button>
    </div>
  )
}
