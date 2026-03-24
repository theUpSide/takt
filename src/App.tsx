import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useAIStore } from '@/stores/aiStore'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout/Layout'
import LoginPage from '@/pages/LoginPage'
import OnboardingPage from '@/pages/OnboardingPage'
import KanbanView from '@/components/Views/KanbanView'
import ListView from '@/components/Views/ListView'
import GanttView from '@/components/Views/GanttView'
import DailyPlannerView from '@/components/Views/DailyPlannerView'
import TimekeepingView from '@/components/Views/TimekeepingView'
import SettingsPage from '@/pages/SettingsPage'
import ToastContainer from '@/components/Common/Toast'
import CommandBar from '@/components/Common/CommandBar'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    if (!user) return

    const checkOnboarding = async () => {
      const { count } = await supabase
        .from('user_phones')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setNeedsOnboarding(count === 0)
      setOnboardingChecked(true)
    }

    checkOnboarding()
  }, [user])

  if (loading || (user && !onboardingChecked)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Redirect to onboarding if no phone registered (but don't redirect if already on onboarding)
  if (needsOnboarding && location.pathname !== '/app/onboarding') {
    return <Navigate to="/app/onboarding" replace />
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
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="kanban" element={<KanbanView />} />
          <Route path="list" element={<ListView />} />
          <Route path="gantt" element={<GanttView />} />
          <Route path="planner" element={<DailyPlannerView />} />
          <Route path="time" element={<TimekeepingView />} />
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
