import { useRef } from 'react'
import { Loader2 } from 'lucide-react'

function useOnceClick(onClick) {
  const firing = useRef(false)
  return async (e) => {
    if (firing.current || !onClick) return
    firing.current = true
    try {
      await onClick(e)
    } finally {
      firing.current = false
    }
  }
}

export function PrimaryButton({ label, onClick, fullWidth = false, disabled = false, loading = false, type = 'button' }) {
  const handleClick = useOnceClick(onClick)
  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 bg-primary hover:bg-primary-dark active:bg-primary-dark text-white font-semibold rounded-btn transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''}`}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {label}
    </button>
  )
}

export function DangerButton({ label, onClick, fullWidth = false, disabled = false, type = 'button' }) {
  const handleClick = useOnceClick(onClick)
  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center justify-center min-h-[48px] px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-700 text-white font-semibold rounded-btn transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''}`}
    >
      {label}
    </button>
  )
}

export function GhostButton({ label, onClick, fullWidth = false, type = 'button' }) {
  const handleClick = useOnceClick(onClick)
  return (
    <button
      type={type}
      onClick={handleClick}
      className={`flex items-center justify-center min-h-[48px] px-6 py-3 bg-transparent border-[1.5px] border-primary text-primary font-semibold rounded-btn hover:bg-primary-light transition-colors duration-150 ${fullWidth ? 'w-full' : ''}`}
    >
      {label}
    </button>
  )
}
