import { useState, useEffect } from 'react'
import { Shield, LogOut, AlertTriangle, Lock, Settings as SettingsIcon, Download, FileText, Calendar, ChevronDown, Store, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppMode } from '../context/AppModeContext'
import { useToast } from '../context/ToastContext'
import { fetchConfig } from '../api/auth'
import { getCollection } from '../api/cache'
import { getSales, resetAllData } from '../api/sales'
import { generateStatement } from '../utils/generateStatement'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { PageWrapper } from '../components/layout/PageWrapper'
import { PrimaryButton, DangerButton } from '../components/ui/Button'
import { ConfirmModal } from '../components/ui/ConfirmModal'

function CodeCard({ isOpen, onToggle, onSave, loading }) {
  const [newCode, setNewCode] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    if (!newCode.trim()) { setError('Code cannot be empty.'); return }
    if (newCode !== confirmCode) { setError('Codes do not match.'); return }
    try {
      await onSave(newCode.trim())
      setNewCode('')
      setConfirmCode('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="bg-primary w-full px-4 py-3 flex items-center gap-2.5"
      >
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <Shield size={15} className="text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-white">Admin Access Code</p>
          <p className="text-[11px] text-white/70">Change login code</p>
        </div>
        <ChevronDown
          size={18}
          className={`text-white/70 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`grid transition-all duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New Code</label>
              <div className="flex items-center border-[1.5px] border-gray-200 rounded-btn focus-within:border-primary transition-colors">
                <Lock size={13} className="ml-3 text-gray-300 shrink-0" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter new code"
                  value={newCode}
                  onChange={e => { setNewCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
                  maxLength={4}
                  autoComplete="off"
                  className="flex-1 min-h-[42px] px-3 text-sm outline-none bg-transparent tracking-widest font-semibold"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirm Code</label>
              <div className="flex items-center border-[1.5px] border-gray-200 rounded-btn focus-within:border-primary transition-colors">
                <Lock size={13} className="ml-3 text-gray-300 shrink-0" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Confirm new code"
                  value={confirmCode}
                  onChange={e => { setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
                  maxLength={4}
                  autoComplete="off"
                  className="flex-1 min-h-[42px] px-3 text-sm outline-none bg-transparent tracking-widest font-semibold"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <PrimaryButton
              label={loading ? 'Updating...' : 'Update Admin Code'}
              onClick={handleSave}
              fullWidth
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const { logout, changeAdminCode } = useAuth()
  const { mode, changeMode } = useAppMode()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [resetModal, setResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [logoutModal, setLogoutModal] = useState(false)
  const [modeModal, setModeModal] = useState(false)
  const [modeLoading, setModeLoading] = useState(false)
  const [openCodeCard, setOpenCodeCard] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [statementModal, setStatementModal] = useState(false)
  const [statementFrom, setStatementFrom] = useState('')
  const [statementTo, setStatementTo] = useState('')
  const [statementLoading, setStatementLoading] = useState(false)
  const [statementError, setStatementError] = useState('')

  const inDebtorsMode = mode === 'debtors'

  async function handleUpdateAdmin(newCode) {
    setCodeLoading(true)
    try {
      const current = await getCollection('config', ['config'], fetchConfig).catch(() => null)
      if (current && newCode === current.admin_code) {
        throw new Error('That is already the current code.')
      }
      await changeAdminCode(newCode)
      showToast('Admin code updated.')
    } finally {
      setCodeLoading(false)
    }
  }

  function requestModeToggle() {
    setModeModal(true)
  }

  async function confirmModeToggle() {
    setModeLoading(true)
    try {
      const next = inDebtorsMode ? 'selling' : 'debtors'
      await changeMode(next)
      setModeModal(false)
      showToast(
        next === 'debtors'
          ? 'Debtors mode on. Sales are paused until you switch back.'
          : 'Selling mode on. Sales are available again.'
      )
      if (next === 'debtors') navigate('/dashboard')
    } catch (err) {
      showToast(err.message || 'Failed to switch mode.', 'error')
    } finally {
      setModeLoading(false)
    }
  }

  async function handleReset() {
    if (resetConfirmText !== 'CONFIRM') return
    setResetLoading(true)
    try {
      await resetAllData()
      showToast('All data has been reset.')
      setResetModal(false)
      setResetConfirmText('')
      navigate('/dashboard')
    } catch (err) {
      showToast(err.message || 'Failed to reset data.', 'error')
    } finally {
      setResetLoading(false)
    }
  }

  async function handleStatementDownload() {
    setStatementError('')
    if (!statementFrom || !statementTo) {
      setStatementError('Please select both start and end dates.')
      return
    }
    if (new Date(statementFrom) > new Date(statementTo)) {
      setStatementError('Start date cannot be after end date.')
      return
    }
    setStatementLoading(true)
    try {
      const endDate = new Date(statementTo)
      endDate.setHours(23, 59, 59, 999)
      const data = await getSales('custom', statementFrom, statementTo, {
        start: statementFrom,
        end: endDate.toISOString(),
      })
      if (data.length === 0) {
        setStatementError('No sales found for the selected period.')
        setStatementLoading(false)
        return
      }
      generateStatement(data, statementFrom, statementTo)
      setStatementModal(false)
      setStatementFrom('')
      setStatementTo('')
      showToast(`Statement downloaded (${data.length} sales).`)
    } catch (err) {
      setStatementError(err.message || 'Failed to generate statement.')
    } finally {
      setStatementLoading(false)
    }
  }

  return (
    <>
      <TopBar
        title="Settings"
        icon={SettingsIcon}
        rightAction={
          <button
            onClick={() => setLogoutModal(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <LogOut size={18} />
          </button>
        }
      />

      <PageWrapper>
        <div className="flex flex-col gap-4 pt-2">

          {/* Profile Card */}
          <div className="bg-gray-800 rounded-card shadow-card p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <p className="text-base font-black text-white">Administrator</p>
              <p className="text-xs text-white/60 mt-0.5">TEODORCAS</p>
              <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white">
                Full Access
              </span>
            </div>
          </div>

          {/* Store Mode */}
          <div className="bg-white rounded-card shadow-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${inDebtorsMode ? 'bg-orange-100' : 'bg-green-100'}`}>
                {inDebtorsMode
                  ? <Users size={18} className="text-orange-600" />
                  : <Store size={18} className="text-green-600" />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Store Mode</p>
                <p className="text-[11px] text-gray-400">
                  {inDebtorsMode
                    ? 'Selling and Debtors — sales paused'
                    : 'Selling — sales, drugs and restock'}
                </p>
              </div>
            </div>
            <button
              onClick={requestModeToggle}
              disabled={modeLoading}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
                inDebtorsMode ? 'bg-orange-500' : 'bg-green-500'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${
                inDebtorsMode ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Account Statement */}
          <div className="bg-white rounded-card shadow-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                <FileText size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Download Statement</p>
                <p className="text-[11px] text-gray-400">Export sales as PDF for a selected period</p>
              </div>
            </div>
            <button
              onClick={() => setStatementModal(true)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-light text-primary hover:bg-primary hover:text-white transition-colors shrink-0"
            >
              <Download size={16} />
            </button>
          </div>

          {/* Section Label */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200" />
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Access Code</p>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <CodeCard
            isOpen={openCodeCard}
            onToggle={() => setOpenCodeCard(prev => !prev)}
            onSave={handleUpdateAdmin}
            loading={codeLoading}
          />

          {/* Danger Zone */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-red-100" />
            <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Danger Zone</p>
            <div className="flex-1 h-px bg-red-100" />
          </div>

          <div className="bg-white rounded-card shadow-card overflow-hidden">
            <div className="bg-red-50 px-4 py-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle size={15} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-700">Reset all data</p>
                <p className="text-[11px] text-red-400">This cannot be undone</p>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500 mb-3">
                Permanently deletes all sales, drug and debtor records. Your access code and store mode are kept.
              </p>
              <DangerButton label="Reset All Data" onClick={() => setResetModal(true)} fullWidth />
            </div>
          </div>

          <div className="pb-2" />
        </div>
      </PageWrapper>

      <BottomNav />

      {/* Mode confirmation */}
      <ConfirmModal
        isOpen={modeModal}
        title={inDebtorsMode ? 'Switch to Selling' : 'Switch to Debtors'}
        message={
          inDebtorsMode
            ? 'Sales, drugs and restock will be available again. Debtors stay where they are.'
            : 'The dashboard will show debts only. Recording sales, drugs and restock are paused until you switch back.'
        }
        confirmLabel={modeLoading ? 'Switching...' : inDebtorsMode ? 'Start Selling' : 'Switch to Debtors'}
        onConfirm={confirmModeToggle}
        onCancel={() => setModeModal(false)}
      />

      {/* Reset Modal */}
      <ConfirmModal
        isOpen={resetModal}
        title="Reset All Data"
        message="This will permanently delete ALL sales, drug and debtor records. Type CONFIRM to proceed."
        confirmLabel={resetLoading ? 'Deleting...' : 'Delete Everything'}
        onConfirm={handleReset}
        onCancel={() => { setResetModal(false); setResetConfirmText('') }}
        dangerous
      >
        <input
          type="text"
          placeholder='Type "CONFIRM" here'
          value={resetConfirmText}
          onChange={e => setResetConfirmText(e.target.value)}
          className="w-full min-h-[42px] px-4 border-[1.5px] border-gray-200 rounded-btn text-sm outline-none focus:border-red-400 -mt-1"
        />
      </ConfirmModal>

      {/* Logout Modal */}
      <ConfirmModal
        isOpen={logoutModal}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log Out"
        onConfirm={() => { logout(); navigate('/', { replace: true }) }}
        onCancel={() => setLogoutModal(false)}
      />

      {/* Statement Modal */}
      {statementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="bg-white rounded-card shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center">
                <Calendar size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Download Statement</p>
                <p className="text-xs text-gray-400">Select date range</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From</label>
                  <input
                    type="date"
                    value={statementFrom}
                    onChange={e => { setStatementFrom(e.target.value); setStatementError('') }}
                    className="w-full min-h-[42px] px-3 py-2 border-[1.5px] border-gray-200 rounded-btn text-sm outline-none focus:border-primary bg-white"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To</label>
                  <input
                    type="date"
                    value={statementTo}
                    onChange={e => { setStatementTo(e.target.value); setStatementError('') }}
                    className="w-full min-h-[42px] px-3 py-2 border-[1.5px] border-gray-200 rounded-btn text-sm outline-none focus:border-primary bg-white"
                  />
                </div>
              </div>
              {statementError && <p className="text-xs text-red-500 font-medium">{statementError}</p>}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setStatementModal(false); setStatementFrom(''); setStatementTo(''); setStatementError('') }}
                className="flex-1 min-h-[42px] border-[1.5px] border-gray-200 text-gray-600 font-semibold rounded-btn text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStatementDownload}
                disabled={statementLoading}
                className="flex-1 min-h-[42px] bg-primary hover:bg-primary-dark text-white font-bold rounded-btn text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {statementLoading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating...</>
                ) : (
                  <><Download size={14} />Download PDF</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
