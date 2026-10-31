import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppModeProvider, useAppMode } from './context/AppModeContext'
import { ToastProvider } from './context/ToastContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import NoConnection from './components/NoConnection'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Drugs from './pages/Drugs'
import AddEditDrug from './pages/AddEditDrug'
import Restock from './pages/Restock'
import Settings from './pages/Settings'
import DebtorsDashboard from './pages/DebtorsDashboard'
import Debtors from './pages/Debtors'
import { useAuth } from './context/AuthContext'

/**
 * The app is either a sales app or a debtors app, decided globally by
 * config.app_mode. These routes send you to the matching dashboard
 * rather than 404 when the mode doesn't line up.
 */
function ModeRoute({ mode, children }) {
  const { inDebtorsMode } = useAppMode()
  const wants = mode === 'debtors'
  if (inDebtorsMode !== wants) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth()
  const { inDebtorsMode } = useAppMode()

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          {inDebtorsMode ? <DebtorsDashboard /> : <Dashboard />}
        </ProtectedRoute>
      } />

      {/* Sales side */}
      <Route path="/drugs" element={
        <ProtectedRoute><ModeRoute mode="selling"><Drugs /></ModeRoute></ProtectedRoute>
      } />
      <Route path="/drugs/add" element={
        <ProtectedRoute><ModeRoute mode="selling"><AddEditDrug /></ModeRoute></ProtectedRoute>
      } />
      <Route path="/drugs/edit/:id" element={
        <ProtectedRoute><ModeRoute mode="selling"><AddEditDrug /></ModeRoute></ProtectedRoute>
      } />
      <Route path="/restock" element={
        <ProtectedRoute><ModeRoute mode="selling"><Restock /></ModeRoute></ProtectedRoute>
      } />

      {/* Debtors side */}
      <Route path="/debtors" element={
        <ProtectedRoute><ModeRoute mode="debtors"><Debtors /></ModeRoute></ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute><Settings /></ProtectedRoute>
      } />

      {/* Legacy routes from the old store app */}
      <Route path="/products" element={<Navigate to="/drugs" replace />} />
      <Route path="/products/add" element={<Navigate to="/drugs/add" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppModeProvider>
          <ToastProvider>
            <NoConnection>
              <AppRoutes />
            </NoConnection>
          </ToastProvider>
        </AppModeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
