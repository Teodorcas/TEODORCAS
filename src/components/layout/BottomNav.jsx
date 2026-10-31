import { Home, Package, Bell, Settings, Users } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppMode } from '../../context/AppModeContext'

const sellingTabs = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Drugs', icon: Package, path: '/drugs' },
  { label: 'Restock', icon: Bell, path: '/restock' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

const debtorsTabs = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Debtors', icon: Users, path: '/debtors' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

export function BottomNav({ inline = false }) {
  const { inDebtorsMode } = useAppMode()
  const navigate = useNavigate()
  const location = useLocation()
  const tabs = inDebtorsMode ? debtorsTabs : sellingTabs

  return (
    <div className={`${inline ? 'relative' : 'fixed bottom-0 left-0 right-0 z-40'} bg-white border-t border-gray-200 shadow-nav`}>
      <div className="max-w-[480px] mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = location.pathname === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[48px] transition-colors duration-150 ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
