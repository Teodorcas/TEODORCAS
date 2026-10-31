import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { login as apiLogin, fetchConfig, updateAdminCode as updateAdminCodeApi } from '../api/auth'
import { getCollection, subscribe, clearCache } from '../api/cache'
import { warmUp } from '../api/prefetch'
import { createSession, validateSession, SESSION_KEY } from '../utils/session'

const AuthContext = createContext(null)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const CONFIG_DEPS = ['config']

export function AuthProvider({ children }) {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const roleRef = useRef(role)
  const lastActivity = useRef(Date.now())
  const sessionCode = useRef(null)

  roleRef.current = role

  // Restore session on mount — a valid token paints the app instantly from
  // the last mirror, while warmUp() refreshes everything underneath it.
  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY)
    if (token) {
      const session = validateSession(token)
      if (session) {
        setRole(session.role)
        sessionCode.current = session.code
        warmUp().catch(() => {})
      } else {
        localStorage.removeItem(SESSION_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Track user activity
  useEffect(() => {
    function resetTimer() {
      lastActivity.current = Date.now()
    }
    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('keydown', resetTimer)
    window.addEventListener('click', resetTimer)
    window.addEventListener('touchstart', resetTimer)
    return () => {
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      window.removeEventListener('click', resetTimer)
      window.removeEventListener('touchstart', resetTimer)
    }
  }, [])

  function forceLogout() {
    setRole(null)
    sessionCode.current = null
    localStorage.removeItem(SESSION_KEY)
    clearCache()
  }

  // Re-validate the session code whenever config is refetched (a write, or
  // the warm-up after a reload) — a changed code signs the session out.
  async function checkSession() {
    if (!roleRef.current || !sessionCode.current) return
    try {
      const config = await getCollection('config', CONFIG_DEPS, fetchConfig)
      if (config && config.admin_code !== sessionCode.current) forceLogout()
    } catch {}
  }

  useEffect(() => {
    if (!role) return

    const unsubscribe = subscribe('config', checkSession)
    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > INACTIVITY_TIMEOUT) forceLogout()
    }, 10000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [role])

  async function loginWithCredentials(code) {
    const result = await apiLogin(code)
    const token = createSession(code, result.role)
    localStorage.setItem(SESSION_KEY, token)
    sessionCode.current = code
    lastActivity.current = Date.now()
    setRole(result.role)
    // A fresh login starts from a clean mirror and fetches everything once.
    clearCache()
    await warmUp()
  }

  /**
   * Changing the admin code must not sign the current session out, so the
   * stored token is reissued with the new code straight away.
   */
  async function changeAdminCode(newCode) {
    await updateAdminCodeApi(newCode)
    const currentRole = roleRef.current || 'admin'
    localStorage.setItem(SESSION_KEY, createSession(newCode, currentRole))
    sessionCode.current = newCode
  }

  function logout() {
    forceLogout()
  }

  const isAdmin = role === 'admin'
  const isAuthenticated = !!role

  return (
    <AuthContext.Provider value={{ role, isAdmin, isAuthenticated, loading, loginWithCredentials, logout, changeAdminCode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
