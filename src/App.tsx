import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/Layout/Layout'
import LoginPage from '@/pages/LoginPage'
import KanbanView from '@/components/Views/KanbanView'
import ListView from '@/components/Views/ListView'
import GanttView from '@/components/Views/GanttView'
import SettingsPage from '@/pages/SettingsPage'
import ToastContainer from '@/components/Common/Toast'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="kanban" replace />} />
          <Route path="kanban" element={<KanbanView />} />
          <Route path="list" element={<ListView />} />
          <Route path="gantt" element={<GanttView />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/app" replace />} />
      </Routes>
      <ToastContainer />
    </>
  )
}

export default App
