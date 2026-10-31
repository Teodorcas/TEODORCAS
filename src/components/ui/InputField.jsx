export function InputField({ label, placeholder, value, onChange, type = 'text', error, helperText, min, max, step }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        className={`w-full min-h-[48px] px-4 py-3 bg-white rounded-btn border-[1.5px] text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors duration-150 ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-gray-200 focus:border-primary'
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="text-xs text-gray-400">{helperText}</p>}
    </div>
  )
}
