import { useState, useRef, useEffect } from 'react'
import { useAIStore } from '@/stores/aiStore'
import clsx from 'clsx'

export default function CommandBar() {
  const { commandBarOpen, closeCommandBar, isProcessing, processNaturalLanguage, executeAction } =
    useAIStore()
  const [input, setInput] = useState('')
  const [recentCommands, setRecentCommands] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (commandBarOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [commandBarOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && commandBarOpen) {
        closeCommandBar()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [commandBarOpen, closeCommandBar])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    const trimmedInput = input.trim()

    // Save to recent commands
    setRecentCommands((prev) => [trimmedInput, ...prev.filter((c) => c !== trimmedInput)].slice(0, 5))

    // Process with Claude
    const action = await processNaturalLanguage(trimmedInput)

    // Execute the action
    const success = await executeAction(action)

    if (success) {
      setInput('')
      closeCommandBar()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      closeCommandBar()
    }
  }

  if (!commandBarOpen) return null

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] animate-fade-in"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-theme-border-primary bg-theme-bg-card/95 backdrop-blur-xl shadow-2xl animate-fade-in-scale overflow-hidden"
        style={{ boxShadow: 'var(--shadow-elevated)' }}
      >
        {/* Input area */}
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 px-4 py-4 border-b border-theme-border-primary">
            {isProcessing ? (
              <div className="h-5 w-5 shrink-0">
                <svg className="animate-spin text-theme-accent-primary" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : (
              <svg
                className="h-5 w-5 shrink-0 text-theme-accent-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a command... (e.g., 'add task call mom tomorrow')"
              disabled={isProcessing}
              className="flex-1 bg-transparent text-lg text-theme-text-primary placeholder:text-theme-text-muted focus:outline-none disabled:opacity-50"
            />
            <kbd className="hidden sm:flex items-center gap-1 rounded-md bg-theme-bg-tertiary px-2 py-1 text-xs font-medium text-theme-text-muted">
              <span>⏎</span> Enter
            </kbd>
          </div>
        </form>

        {/* Suggestions / Help */}
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-theme-text-muted uppercase tracking-wider mb-2">
            Try saying
          </div>
          <div className="space-y-1">
            {[
              'remind me to call mom tomorrow',
              'add work task: review quarterly report by Friday',
              'schedule meeting with John next Tuesday at 2pm',
              'mark buy groceries as done',
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-all-fast',
                  'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary'
                )}
              >
                <span className="text-theme-accent-primary mr-2">→</span>
                {suggestion}
              </button>
            ))}
          </div>

          {recentCommands.length > 0 && (
            <>
              <div className="text-xs font-medium text-theme-text-muted uppercase tracking-wider mt-4 mb-2">
                Recent
              </div>
              <div className="space-y-1">
                {recentCommands.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(cmd)}
                    className={clsx(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-all-fast',
                      'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary'
                    )}
                  >
                    <span className="text-theme-text-muted mr-2">↺</span>
                    {cmd}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-theme-border-primary bg-theme-bg-secondary/50 flex items-center justify-between text-xs text-theme-text-muted">
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Powered by Claude
          </span>
          <span>
            <kbd className="rounded bg-theme-bg-tertiary px-1.5 py-0.5 font-mono">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  )
}
