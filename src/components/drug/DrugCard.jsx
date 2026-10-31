import { Pencil } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { formatCurrency } from '../../utils/formatters'
import { getQuantityStatus, getQuantityColorClass } from '../../utils/quantityStatus'
import { getDrugIcon } from '../../utils/drugIcons'
import { totalSachets, packLabel, formatSachets } from '../../utils/stock'

export function DrugCard({ drug, showEdit = false, onEdit }) {
  const available = totalSachets(drug)
  const status = getQuantityStatus(available, drug.restock_threshold)
  const qtyColor = getQuantityColorClass(status)
  const Icon = getDrugIcon(drug.icon)
  const isCarton = drug.pack_type === 'carton'

  return (
    <div className="bg-white rounded-card shadow-card px-3 py-2.5 flex items-center gap-3">
      {/* Icon */}
      <div className="w-11 h-11 rounded-lg shrink-0 bg-primary-light flex items-center justify-center">
        <Icon size={20} className="text-primary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm truncate leading-tight">{drug.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            label={packLabel(drug)}
            type={isCarton ? 'bulk' : 'small'}
          />
          <span className={`text-xs font-bold ${qtyColor}`}>
            Qty: {formatSachets(available)}
          </span>
          {isCarton && drug.stock_cartons > 0 && (
            <span className="text-[10px] text-gray-400">{drug.stock_cartons} ctn</span>
          )}
        </div>
      </div>

      {/* Price + Edit */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900 font-sans">{formatCurrency(drug.price_per_sachet)}</p>
          <p className="text-[10px] text-gray-400">per sachet</p>
          {isCarton && (
            <p className="text-[10px] text-accent font-semibold font-sans">
              {formatCurrency(drug.price_per_carton)} / ctn
            </p>
          )}
        </div>
        {showEdit && (
          <button
            onClick={() => onEdit(drug)}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-light text-primary hover:bg-primary hover:text-white transition-colors"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
