import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { OtpInput } from '../components/ui/OtpInput'

export default function Login() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // 'idle' | 'error' | 'success' — paints the border of the code boxes.
  const [status, setStatus] = useState('idle')
  const [attempt, setAttempt] = useState(0)
  const submittingRef = useRef(false)
  const { loginWithCredentials } = useAuth()
  const navigate = useNavigate()

  /**
   * Takes the entered code as an argument because this also runs straight out
   * of the change handler, where the `code` state has not been committed yet.
   * `submittingRef` stops a paste, a fast retype of the last box or a stray
   * second tap from kicking off a second attempt.
   */
  async function handleLogin(value = code) {
    const entered = String(value || '')
    if (submittingRef.current) return
    if (entered.length !== 4) { setError('Please enter your 4-digit code.'); return }

    submittingRef.current = true
    setError('')
    setLoading(true)
    try {
      await loginWithCredentials(entered)
      setLoading(false)
      setStatus('success')
      // Hold for the green border to walk across the boxes before moving on.
      await new Promise(resolve => setTimeout(resolve, 900))
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setStatus('error')
      setAttempt(n => n + 1)
      setError(err.message || 'Incorrect code. Try again.')
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  /** Types a digit; the login fires by itself the moment the last one lands. */
  function handleCodeChange(next) {
    setCode(next)
    setError('')
    setStatus('idle')
    if (next.length === 4) handleLogin(next)
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Text logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="px-6 py-3.5 rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-lg">
            <span className="text-3xl font-black text-white tracking-tight leading-none">TEODORCAS</span>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-semibold text-gray-400 tracking-[0.3em] uppercase">Pharmacy</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-card shadow-card p-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center">
              <Store size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Welcome back</p>
              <p className="text-xs text-gray-400">It signs you in on the last digit</p>
            </div>
          </div>

          {/* Access code */}
          <div className="flex flex-col items-center gap-2">
            <OtpInput
              value={code}
              onChange={handleCodeChange}
              status={status}
              attempt={attempt}
              autoFocus
            />
            {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || code.length !== 4}
            className="w-full min-h-[48px] bg-primary hover:bg-primary-dark text-white font-bold rounded-btn transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Checking...</>
            ) : 'Login'}
          </button>
        </div>

        <p className="text-[11px] text-gray-400">TEODORCAS © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
