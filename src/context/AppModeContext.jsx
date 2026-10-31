import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchConfig, updateAppMode } from '../api/auth'
import { getCollection, subscribe, readEntry } from '../api/cache'
import { useAuth } from './AuthContext'

const MODE_DEPS = ['config']

const AppModeContext = createContext(null)

/**
 * The store mode lives in config.app_mode and is global: every device
 * sees the same mode. 'selling' → sales app, 'debtors' → debtors app.
 */
export function AppModeProvider({ children }) {
  const { isAuthenticated } = useAuth()

  // Paint instantly from the mirror, then reconcile from sync_state.
  const [mode, setMode] = useState(() => readEntry('config')?.data?.app_mode || 'selling')

  const sync = useCallback(async () => {
    try {
      const config = await getCollection('config', MODE_DEPS, fetchConfig)
      if (config?.app_mode) setMode(config.app_mode)
    } catch {}
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    sync()
    return subscribe('config', sync)
  }, [isAuthenticated, sync])

  async function changeMode(next) {
    if (next !== 'selling' && next !== 'debtors') return
    await updateAppMode(next)
    setMode(next)
  }

  const value = {
    mode,
    inDebtorsMode: mode === 'debtors',
    changeMode,
  }

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>
}

export function useAppMode() {
  const ctx = useContext(AppModeContext)
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider')
  return ctx
}
