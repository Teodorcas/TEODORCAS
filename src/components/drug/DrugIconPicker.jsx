import { Check } from 'lucide-react'
import { DRUG_ICONS, getDrugIcon, DEFAULT_DRUG_ICON } from '../../utils/drugIcons'

/** Grid of preset medicine icons — replaces the photo upload. */
export function DrugIconPicker({ value, onChange, error }) {
  const selected = value || DEFAULT_DRUG_ICON

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">Drug Icon</label>

      <div className={`rounded-card bg-white shadow-card p-3 grid grid-cols-6 gap-2 ${error ? 'border-[1.5px] border-red-300' : ''}`}>
        {DRUG_ICONS.map(icon => {
          const Icon = getDrugIcon(icon.name)
          const isActive = selected === icon.name
          return (
            <button
              key={icon.name}
              type="button"
              onClick={() => onChange(icon.name)}
              title={icon.label}
              className={`relative aspect-square rounded-btn flex items-center justify-center transition-colors duration-150 ${
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-brand-surface-secondary text-gray-500 hover:bg-primary-light hover:text-primary'
              }`}
            >
              <Icon size={20} />
              {isActive && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
