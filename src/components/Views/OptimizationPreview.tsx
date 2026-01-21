import type { Item } from '@/types'
import clsx from 'clsx'

interface ScheduleSuggestion {
  item_id: string
  scheduled_start: string
  duration_minutes: number
}

interface OptimizationPreviewProps {
  schedule: ScheduleSuggestion[]
  reasoning: string
  items: Item[]
  onApply: () => void
  onReject: () => void
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

export default function OptimizationPreview({ schedule, reasoning, items, onApply, onReject }: OptimizationPreviewProps) {
  // Get item details by ID
  const getItemById = (id: string) => items.find(i => i.id === id)

  // Sort schedule by start time
  const sortedSchedule = [...schedule].sort((a, b) => {
    return a.scheduled_start.localeCompare(b.scheduled_start)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'var(--bg-overlay)' }}>
      <div className="w-full max-w-lg mx-4 rounded-2xl border border-theme-border-primary bg-theme-bg-card shadow-2xl animate-fade-in-scale overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-theme-border-primary bg-gradient-to-r from-theme-accent-primary/10 to-theme-accent-secondary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-theme-accent-success/20">
              <svg className="h-6 w-6 text-theme-accent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-text-primary">
                AI Schedule Suggestion
              </h3>
              <p className="text-sm text-theme-text-secondary">
                Review the suggested schedule below
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-auto">
          {schedule.length === 0 ? (
            <div className="text-center py-8">
              <svg className="h-12 w-12 mx-auto mb-3 text-theme-text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-theme-text-secondary">
                No scheduling changes suggested.
              </p>
            </div>
          ) : (
            <>
              {/* Schedule list */}
              <div className="space-y-2 mb-4">
                {sortedSchedule.map((suggestion) => {
                  const item = getItemById(suggestion.item_id)
                  if (!item) return null

                  return (
                    <div
                      key={suggestion.item_id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-theme-accent-success/30 bg-theme-accent-success/5"
                    >
                      {/* Time */}
                      <div className="shrink-0 w-20 text-center">
                        <div className="text-sm font-semibold text-theme-accent-success">
                          {formatTime(suggestion.scheduled_start)}
                        </div>
                        <div className="text-xs text-theme-text-muted">
                          {formatDuration(suggestion.duration_minutes)}
                        </div>
                      </div>

                      {/* Arrow */}
                      <svg className="h-4 w-4 shrink-0 text-theme-accent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>

                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-theme-text-primary truncate">
                          {item.title}
                        </div>
                        {item.category && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: item.category.color }}
                            />
                            <span className="text-xs text-theme-text-muted">
                              {item.category.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Reasoning */}
              {reasoning && (
                <div className="p-3 rounded-lg bg-theme-bg-secondary border border-theme-border-primary">
                  <div className="flex items-start gap-2">
                    <svg className="h-4 w-4 shrink-0 mt-0.5 text-theme-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-theme-text-secondary">
                      {reasoning}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-theme-border-primary bg-theme-bg-secondary flex items-center justify-end gap-3">
          <button
            onClick={onReject}
            className="px-4 py-2 rounded-lg text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast btn-press"
          >
            Keep Current
          </button>
          <button
            onClick={onApply}
            disabled={schedule.length === 0}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all-fast btn-press',
              schedule.length > 0
                ? 'bg-theme-accent-success text-white hover:opacity-90 shadow-md'
                : 'bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed'
            )}
          >
            Apply Schedule
          </button>
        </div>
      </div>
    </div>
  )
}
