import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useAIStore } from '@/stores/aiStore'
import Layout from '@/components/Layout/Layout'
import LoginPage from '@/pages/LoginPage'
import KanbanView from '@/components/Views/KanbanView'
import ListView from '@/components/Views/ListView'
import GanttView from '@/components/Views/GanttView'
import DailyPlannerView from '@/components/Views/DailyPlannerView'
import SettingsPage from '@/pages/SettingsPage'
import ToastContainer from '@/components/Common/Toast'
import CommandBar from '@/components/Common/CommandBar'

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
  const { toggleCommandBar } = useAIStore()

  // Global keyboard shortcut for command bar (⌘+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandBar()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandBar])

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
          <Route path="planner" element={<DailyPlannerView />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/app" replace />} />
      </Routes>
      <ToastContainer />
      <CommandBar />
    </>
  )
}

export default App
