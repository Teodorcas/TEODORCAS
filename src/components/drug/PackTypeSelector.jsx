/**
 * Sachet | Carton — how the drug is packaged.
 *  sachet → loose sachets only, price is per sachet
 *  carton → stored in cartons, needs sachets-per-carton + price per sachet
 */
export function PackTypeSelector({ selected, onChange, error }) {
  const options = [
    { key: 'sachet', label: 'Sachet' },
    { key: 'carton', label: 'Carton' },
  ]

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">Packed As</label>
      <div className="flex gap-3">
        {options.map(option => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`flex-1 min-h-[48px] rounded-btn border-[1.5px] font-semibold text-sm transition-colors duration-150 ${
              selected === option.key
                ? 'bg-primary border-primary text-white'
                : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
