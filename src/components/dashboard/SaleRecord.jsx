import { formatTime, formatCurrency } from '../../utils/formatters'
import { getDrugIcon } from '../../utils/drugIcons'
import { formatSachets } from '../../utils/stock'

export function SaleRecord({ sale, showPrice }) {
  const icon = sale.drugs?.icon
  const Icon = getDrugIcon(icon)

  return (
    <div className="bg-white rounded-card shadow-card p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg shrink-0 bg-primary-light flex items-center justify-center">
        <Icon size={18} className="text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate leading-tight">{sale.drug_name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatSachets(sale.sachets)} {Number(sale.sachets) === 1 ? 'sachet' : 'sachets'}
          <span className="ml-1.5 text-gray-400">· {formatTime(sale.timestamp)}</span>
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        {showPrice && (
          <p className="text-sm font-bold text-gray-900 font-sans">{formatCurrency(sale.final_amount)}</p>
        )}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-100 text-[10px] font-bold text-green-700">
          PAID
        </span>
      </div>
    </div>
  )
}
