import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../api/supabase'
import { login as apiLogin, signOut as apiSignOut, updateAdminCode as updateAdminCodeApi } from '../api/auth'
import { clearCache } from '../api/cache'
import { warmUp } from '../api/prefetch'

const AuthContext = createContext(null)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export function AuthProvider({ children }) {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const roleRef = useRef(role)
  const lastActivity = useRef(Date.now())

  roleRef.current = role

  // Supabase Auth owns the session, so wait for it before painting anything.
  // A session that is still valid opens straight onto the dashboard and
  // warms the mirror; one that has expired drops to the login screen rather
  // than a blank page. Nothing here polls.
  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        if (data.session) {
          setRole('admin')
          lastActivity.current = Date.now()
          warmUp().catch(() => {})
        }
        setLoading(false)
      })
      .catch(() => { if (mounted) setLoading(false) })

    // Keeps role and storage in step for the life of the tab.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (session) {
        setRole('admin')
        lastActivity.current = Date.now()
      } else {
        setRole(null)
        clearCache()
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
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
    lastActivity.current = Date.now()
    clearCache()
    apiSignOut()
  }

  useEffect(() => {
    if (!role) return

    // Inactivity only — session validity is handled by Supabase Auth, so
    // nothing here reads the database on a timer.
    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > INACTIVITY_TIMEOUT) forceLogout()
    }, 10000)

    return () => clearInterval(interval)
  }, [role])

  async function loginWithCredentials(code) {
    await apiLogin(code)
    // A fresh login starts from a clean mirror and fetches everything once.
    clearCache()
    await warmUp()
  }

  /**
   * Resets the Supabase Auth password, which is what the access code has
   * become. The token is issued by Supabase and stays valid, so the current
   * session is not signed out.
   */
  async function changeAdminCode(newCode) {
    await updateAdminCodeApi(newCode)
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
