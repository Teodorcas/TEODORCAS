import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function TopBar({ title, subtitle, icon: Icon, rightAction, showBack = false, onBack }) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-topbar">
      <div className="max-w-[480px] mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          {Icon && !showBack && (
            <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center">
              <Icon size={16} className="text-primary" />
            </div>
          )}
          <div>
            <h1 className={`font-bold text-gray-900 leading-tight ${subtitle ? 'text-base' : 'text-lg'}`}>
              {title}
            </h1>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {rightAction && (
          <div className="flex items-center gap-2">{rightAction}</div>
        )}
      </div>
    </div>
  )
}
