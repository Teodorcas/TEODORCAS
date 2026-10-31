import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export default function NoConnection({ children }) {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    function handleOnline() { setOnline(true) }
    function handleOffline() { setOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online) return children

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-5">
      <div className="flex flex-col items-center gap-4 max-w-xs text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <WifiOff size={28} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">No Internet Connection</h2>
        <p className="text-sm text-gray-500 leading-relaxed flex items-center gap-1">
          Waiting for connection
          <span className="inline-flex w-6 text-left">
            <span className="animate-[dot1_1.4s_infinite]">.</span>
            <span className="animate-[dot2_1.4s_infinite]">.</span>
            <span className="animate-[dot3_1.4s_infinite]">.</span>
          </span>
        </p>
      </div>
    </div>
  )
}
