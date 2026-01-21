import { useNavigate, useLocation } from 'react-router-dom'
import { useViewStore } from '@/stores/viewStore'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore, themeLabels, type ThemeName } from '@/stores/themeStore'
import type { ViewType } from '@/types'
import clsx from 'clsx'

const viewOptions: { id: ViewType; label: string }[] = [
  { id: 'kanban', label: 'Kanban' },
  { id: 'list', label: 'List' },
  { id: 'gantt', label: 'Gantt' },
]

const themeIcons: Record<ThemeName, JSX.Element> = {
  default: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  midnight: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
    </svg>
  ),
  matrix: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  light: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
}

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toggleSidebar, openCreateTaskModal, openCreateEventModal } = useViewStore()
  const { signOut } = useAuthStore()
  const { theme, cycleTheme } = useThemeStore()

  const currentView = location.pathname.split('/').pop() as ViewType

  const handleViewChange = (view: ViewType) => {
    navigate(`/app/${view}`)
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-theme-border-primary bg-theme-bg-primary px-4 transition-theme" style={{ background: 'var(--header-gradient)' }}>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded p-2 text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast btn-press"
          aria-label="Toggle sidebar"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-theme-text-primary tracking-tight">Takt</h1>
      </div>

      <nav className="flex items-center gap-1 rounded-lg bg-theme-bg-tertiary p-1 transition-theme">
        {viewOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleViewChange(option.id)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-all-fast btn-press',
              currentView === option.id
                ? 'bg-theme-bg-card text-theme-text-primary shadow-md'
                : 'text-theme-text-secondary hover:text-theme-text-primary'
            )}
          >
            {option.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="group relative flex items-center gap-2 rounded-lg border border-theme-border-primary px-3 py-1.5 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary hover:border-theme-accent-primary transition-all-fast btn-press"
          title={`Theme: ${themeLabels[theme]}`}
        >
          <span className="text-theme-accent-primary">{themeIcons[theme]}</span>
          <span className="hidden sm:inline">{themeLabels[theme]}</span>
        </button>

        <div className="relative">
          <button
            className="flex items-center gap-1 rounded-lg bg-theme-accent-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 shadow-md hover:shadow-glow-primary transition-all-fast btn-press"
            onClick={openCreateTaskModal}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>
        <button
          onClick={openCreateEventModal}
          className="rounded-lg border border-theme-border-secondary px-3 py-1.5 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary hover:border-theme-accent-primary transition-all-fast btn-press"
        >
          New Event
        </button>
        <button
          onClick={() => navigate('/app/settings')}
          className="rounded p-2 text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast btn-press"
          aria-label="Settings"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
        <button
          onClick={signOut}
          className="rounded p-2 text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-accent-danger transition-all-fast btn-press"
          aria-label="Sign out"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}
