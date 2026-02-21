import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useViewStore } from '@/stores/viewStore'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore, themeLabels, type ThemeName } from '@/stores/themeStore'
import { useAIStore } from '@/stores/aiStore'
import type { ViewType } from '@/types'
import clsx from 'clsx'

// View options with icons for mobile
const viewOptions: { id: ViewType; label: string; icon: JSX.Element }[] = [
  {
    id: 'kanban',
    label: 'Kanban',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    id: 'list',
    label: 'List',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'gantt',
    label: 'Gantt',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'planner',
    label: 'Planner',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'time',
    label: 'Time',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

const themeIcons: Record<ThemeName, JSX.Element> = {
  takt: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  ),
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
  const { openCommandBar } = useAIStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentView = location.pathname.split('/').pop() as ViewType

  const handleViewChange = (view: ViewType) => {
    navigate(`/app/${view}`)
  }

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileMenuOpen])

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="relative flex h-14 items-center justify-between border-b border-theme-border-primary bg-theme-bg-primary px-3 md:px-4 transition-theme safe-area-top" style={{ background: 'var(--header-gradient)' }}>
      {/* Gradient accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary), var(--accent-success))',
        }}
      />

      {/* Left: Sidebar toggle + Logo */}
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded p-2 text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast btn-press"
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <img
            src="/brand/takt_app_icon_gradient_transparent_bg.png"
            alt="Takt"
            className="h-8 w-8 rounded-lg"
          />
          <span className="hidden sm:inline text-lg font-semibold text-theme-text-primary tracking-tight">Takt</span>
        </div>
      </div>

      {/* Center: View Navigation */}
      <nav className="flex items-center gap-0.5 md:gap-1 rounded-lg bg-theme-bg-tertiary p-0.5 md:p-1 transition-theme">
        {viewOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleViewChange(option.id)}
            className={clsx(
              'flex items-center gap-1.5 rounded-md px-2 py-1.5 md:px-3 text-sm font-medium transition-all-fast btn-press',
              currentView === option.id
                ? 'bg-theme-bg-card text-theme-text-primary shadow-md'
                : 'text-theme-text-secondary hover:text-theme-text-primary'
            )}
            title={option.label}
          >
            <span className="md:hidden">{option.icon}</span>
            <span className="hidden md:inline">{option.label}</span>
          </button>
        ))}
      </nav>

      {/* Right: Desktop toolbar (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-2">
        {/* Smart Command Bar Button */}
        <button
          onClick={openCommandBar}
          className="flex items-center gap-2 rounded-lg border border-theme-border-primary px-3 py-1.5 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary hover:border-theme-accent-primary transition-all-fast btn-press"
          title="Smart Entry (⌘K)"
        >
          <svg className="h-4 w-4 text-theme-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="hidden lg:inline">Smart Entry</span>
          <kbd className="hidden sm:flex items-center gap-0.5 rounded bg-theme-bg-tertiary px-1.5 py-0.5 text-xs font-mono text-theme-text-muted">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={cycleTheme}
          className="group relative flex items-center gap-2 rounded-lg border border-theme-border-primary px-3 py-1.5 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary hover:border-theme-accent-primary transition-all-fast btn-press"
          title={`Theme: ${themeLabels[theme]}`}
        >
          <span className="text-theme-accent-primary">{themeIcons[theme]}</span>
          <span className="hidden lg:inline">{themeLabels[theme]}</span>
        </button>

        <button
          className="flex items-center gap-1 rounded-lg bg-theme-accent-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 shadow-md hover:shadow-glow-primary transition-all-fast btn-press"
          onClick={openCreateTaskModal}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Task
        </button>

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
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <button
          onClick={signOut}
          className="rounded p-2 text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-accent-danger transition-all-fast btn-press"
          aria-label="Sign out"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* Right: Mobile menu button + quick add (visible on mobile only) */}
      <div className="flex md:hidden items-center gap-1">
        {/* Quick add button on mobile */}
        <button
          className="flex items-center justify-center rounded-lg bg-theme-accent-primary p-2 text-white hover:opacity-90 shadow-md transition-all-fast btn-press"
          onClick={openCreateTaskModal}
          aria-label="New Task"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Mobile menu button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded p-2 text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast btn-press"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-theme-border-primary bg-theme-bg-card shadow-xl z-50 animate-fade-in overflow-hidden">
              {/* Smart Entry */}
              <button
                onClick={() => {
                  openCommandBar()
                  setMobileMenuOpen(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast"
              >
                <svg className="h-5 w-5 text-theme-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Smart Entry
              </button>

              {/* New Event */}
              <button
                onClick={() => {
                  openCreateEventModal()
                  setMobileMenuOpen(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                New Event
              </button>

              <div className="border-t border-theme-border-primary" />

              {/* Theme */}
              <button
                onClick={() => {
                  cycleTheme()
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast"
              >
                <span className="flex items-center gap-3">
                  <span className="text-theme-accent-primary">{themeIcons[theme]}</span>
                  Theme
                </span>
                <span className="text-xs text-theme-text-muted">{themeLabels[theme]}</span>
              </button>

              {/* Settings */}
              <button
                onClick={() => {
                  navigate('/app/settings')
                  setMobileMenuOpen(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>

              <div className="border-t border-theme-border-primary" />

              {/* Sign Out */}
              <button
                onClick={() => {
                  signOut()
                  setMobileMenuOpen(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-theme-accent-danger hover:bg-theme-accent-danger/10 transition-all-fast"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
