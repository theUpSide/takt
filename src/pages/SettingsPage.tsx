import { useState } from 'react'
import CategoryManager from '@/components/Settings/CategoryManager'
import CalendarSources from '@/components/Settings/CalendarSources'
import PeopleManager from '@/components/Settings/PeopleManager'
import { useThemeStore, themeLabels, themeDescriptions, type ThemeName } from '@/stores/themeStore'
import { useAIStore } from '@/stores/aiStore'
import { useToastStore } from '@/stores/toastStore'
import clsx from 'clsx'

type SettingsTab = 'appearance' | 'ai' | 'categories' | 'calendars' | 'people'

const themeOptions: ThemeName[] = ['default', 'midnight', 'matrix', 'light']

const themePreviewColors: Record<ThemeName, { bg: string; accent: string; text: string }> = {
  default: { bg: '#1f2937', accent: '#3b82f6', text: '#f9fafb' },
  midnight: { bg: '#000000', accent: '#3b82f6', text: '#ffffff' },
  matrix: { bg: '#000000', accent: '#00ff41', text: '#e0ffe0' },
  light: { bg: '#ffffff', accent: '#2563eb', text: '#111827' },
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const { theme, setTheme } = useThemeStore()
  const { apiKey, setApiKey } = useAIStore()
  const toast = useToastStore()
  const [tempApiKey, setTempApiKey] = useState(apiKey || '')
  const [showApiKey, setShowApiKey] = useState(false)

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey.trim())
      toast.success('API key saved')
    } else {
      setApiKey(null)
      toast.info('API key removed')
    }
  }

  const tabs: { id: SettingsTab; label: string; icon: JSX.Element }[] = [
    {
      id: 'appearance',
      label: 'Appearance',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
    {
      id: 'ai',
      label: 'AI Assistant',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      id: 'calendars',
      label: 'Calendars',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'people',
      label: 'People',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-theme-text-primary tracking-tight">Settings</h1>

      <div className="mb-6 border-b border-theme-border-primary">
        <nav className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-medium transition-all-fast btn-press',
                activeTab === tab.id
                  ? 'border-theme-accent-primary text-theme-accent-primary'
                  : 'border-transparent text-theme-text-muted hover:text-theme-text-primary hover:border-theme-border-secondary'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="rounded-xl bg-theme-bg-card p-6 shadow-card border border-theme-border-primary transition-theme">
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-theme-text-primary mb-1">Theme</h2>
              <p className="text-sm text-theme-text-muted mb-4">Choose your preferred color scheme</p>

              <div className="grid grid-cols-2 gap-4">
                {themeOptions.map((themeOption) => {
                  const colors = themePreviewColors[themeOption]
                  const isSelected = theme === themeOption

                  return (
                    <button
                      key={themeOption}
                      onClick={() => setTheme(themeOption)}
                      className={clsx(
                        'relative rounded-xl p-4 text-left transition-all-fast btn-press',
                        'border-2',
                        isSelected
                          ? 'border-theme-accent-primary shadow-glow-primary'
                          : 'border-theme-border-primary hover:border-theme-border-secondary'
                      )}
                    >
                      {/* Preview */}
                      <div
                        className="mb-3 h-20 rounded-lg p-3 flex flex-col justify-between shadow-inner"
                        style={{ backgroundColor: colors.bg }}
                      >
                        <div className="flex gap-2">
                          <div
                            className="h-2 w-8 rounded"
                            style={{ backgroundColor: colors.accent }}
                          />
                          <div
                            className="h-2 w-12 rounded opacity-50"
                            style={{ backgroundColor: colors.text }}
                          />
                        </div>
                        <div className="space-y-1">
                          <div
                            className="h-1.5 w-full rounded opacity-30"
                            style={{ backgroundColor: colors.text }}
                          />
                          <div
                            className="h-1.5 w-3/4 rounded opacity-30"
                            style={{ backgroundColor: colors.text }}
                          />
                        </div>
                      </div>

                      {/* Label */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-theme-text-primary">
                            {themeLabels[themeOption]}
                          </p>
                          <p className="text-xs text-theme-text-muted">
                            {themeDescriptions[themeOption]}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-theme-accent-primary text-white">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-theme-border-primary pt-6">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-1">Interface</h2>
              <p className="text-sm text-theme-text-muted mb-4">Customize the user interface behavior</p>

              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-lg border border-theme-border-primary p-4 transition-all-fast hover:bg-theme-bg-hover cursor-pointer">
                  <div>
                    <p className="font-medium text-theme-text-primary">Smooth animations</p>
                    <p className="text-sm text-theme-text-muted">Enable transitions and animations</p>
                  </div>
                  <div className="h-6 w-11 rounded-full bg-theme-accent-primary relative">
                    <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
                  </div>
                </label>

                <label className="flex items-center justify-between rounded-lg border border-theme-border-primary p-4 transition-all-fast hover:bg-theme-bg-hover cursor-pointer">
                  <div>
                    <p className="font-medium text-theme-text-primary">Compact mode</p>
                    <p className="text-sm text-theme-text-muted">Reduce spacing for more content</p>
                  </div>
                  <div className="h-6 w-11 rounded-full bg-theme-bg-tertiary relative">
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-theme-text-primary mb-1">Claude AI Integration</h2>
              <p className="text-sm text-theme-text-muted mb-4">
                Enable natural language task creation with Claude. Use the Smart Entry (⌘K) to create tasks by typing naturally.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text-primary mb-2">
                    Anthropic API Key
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-4 py-2.5 text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/20 transition-all-fast"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text-primary transition-all-fast"
                      >
                        {showApiKey ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <button
                      onClick={handleSaveApiKey}
                      className="rounded-lg bg-theme-accent-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-all-fast btn-press"
                    >
                      Save
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-theme-text-muted">
                    Get your API key from{' '}
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-accent-primary hover:underline"
                    >
                      console.anthropic.com
                    </a>
                  </p>
                </div>

                {apiKey && (
                  <div className="rounded-lg border border-theme-accent-success/30 bg-theme-accent-success/10 p-4">
                    <div className="flex items-center gap-2 text-theme-accent-success">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">API key configured</span>
                    </div>
                    <p className="mt-1 text-sm text-theme-text-secondary">
                      Smart Entry is ready to use. Press ⌘K anywhere to open.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-theme-border-primary pt-6">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-1">How to Use</h2>
              <p className="text-sm text-theme-text-muted mb-4">
                Type naturally and Claude will create tasks for you
              </p>

              <div className="space-y-3">
                <div className="rounded-lg border border-theme-border-primary p-4">
                  <p className="font-medium text-theme-text-primary mb-2">Example commands:</p>
                  <ul className="space-y-2 text-sm text-theme-text-secondary">
                    <li className="flex items-start gap-2">
                      <span className="text-theme-accent-primary">→</span>
                      <span>"remind me to call mom tomorrow"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-theme-accent-primary">→</span>
                      <span>"add work task: review quarterly report by Friday"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-theme-accent-primary">→</span>
                      <span>"schedule meeting with John next Tuesday at 2pm"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-theme-accent-primary">→</span>
                      <span>"mark buy groceries as done"</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'categories' && <CategoryManager />}
        {activeTab === 'calendars' && <CalendarSources />}
        {activeTab === 'people' && <PeopleManager />}
      </div>
    </div>
  )
}
