import { useMemo } from 'react'
import { getLocalDateString, getTodayString } from '@/lib/dateUtils'

interface DateNavigatorProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateOnly = new Date(date)
  dateOnly.setHours(0, 0, 0, 0)

  if (dateOnly.getTime() === today.getTime()) {
    return 'Today'
  } else if (dateOnly.getTime() === tomorrow.getTime()) {
    return 'Tomorrow'
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return getLocalDateString(date)
}

export default function DateNavigator({ selectedDate, onDateChange }: DateNavigatorProps) {
  const today = useMemo(() => getTodayString(), [])
  const isToday = selectedDate === today

  const displayDate = formatDateDisplay(selectedDate)

  const goToPrevious = () => {
    onDateChange(addDays(selectedDate, -1))
  }

  const goToNext = () => {
    onDateChange(addDays(selectedDate, 1))
  }

  const goToToday = () => {
    onDateChange(today)
  }

  return (
    <div className="flex items-center gap-3">
      {/* Navigation arrows */}
      <div className="flex items-center gap-1">
        <button
          onClick={goToPrevious}
          className="p-1.5 rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast btn-press"
          aria-label="Previous day"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={goToNext}
          className="p-1.5 rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast btn-press"
          aria-label="Next day"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Date display */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-theme-text-primary">
          {displayDate}
        </h2>

        {isToday && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-theme-accent-primary/20 text-theme-accent-primary">
            Today
          </span>
        )}
      </div>

      {/* Today button */}
      {!isToday && (
        <button
          onClick={goToToday}
          className="px-3 py-1 rounded-lg text-sm font-medium text-theme-accent-primary hover:bg-theme-accent-primary/10 transition-all-fast btn-press"
        >
          Go to Today
        </button>
      )}

      {/* Date picker */}
      <div className="relative">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <button
          className="p-1.5 rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast btn-press"
          aria-label="Pick date"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
