import { useState } from 'react'
import { X } from 'lucide-react'
import { PrimaryButton, DangerButton, GhostButton } from './Button'

export function ConfirmModal({ isOpen, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, dangerous = false, hideCancel = false, children }) {
  const [fired, setFired] = useState(false)

  if (!isOpen) return null

  async function handleConfirm() {
    if (fired) return
    setFired(true)
    try {
      await onConfirm()
    } finally {
      setFired(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-card shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5">
            <X size={20} />
          </button>
        </div>
        {message && <p className="text-sm text-gray-600 leading-relaxed">{message}</p>}
        {children}
        <div className={`flex flex-col gap-2 ${hideCancel ? 'mt-1' : 'mt-1'}`}>
          {dangerous
            ? <DangerButton label={fired ? 'Please wait...' : confirmLabel} onClick={handleConfirm} fullWidth disabled={fired} />
            : <PrimaryButton label={fired ? 'Please wait...' : confirmLabel} onClick={handleConfirm} fullWidth disabled={fired} loading={fired} />
          }
          {!hideCancel && <GhostButton label="Cancel" onClick={onCancel} fullWidth />}
        </div>
      </div>
    </div>
  )
}
