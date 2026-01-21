import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  isBefore,
  isAfter,
  parseISO,
  startOfDay,
  endOfDay,
  addHours,
} from 'date-fns'

/**
 * Format a date for display in the UI
 */
export function formatDate(date: string | Date, formatStr = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr)
}

/**
 * Format a time for display
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'h:mm a')
}

/**
 * Format a date and time together
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy h:mm a')
}

/**
 * Get a relative date string (Today, Tomorrow, Yesterday, or date)
 */
export function getRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date

  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isYesterday(d)) return 'Yesterday'

  return format(d, 'MMM d')
}

/**
 * Get a human-readable relative time (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

/**
 * Check if a date is overdue (in the past)
 */
export function isOverdue(date: string | Date): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isPast(d) && !isToday(d)
}

/**
 * Check if a date is due today
 */
export function isDueToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isToday(d)
}

/**
 * Get the status color class based on due date
 */
export function getDueDateColorClass(dueDate: string | null, completed: boolean): string {
  if (completed) return 'text-gray-400'
  if (!dueDate) return 'text-gray-500'

  const d = parseISO(dueDate)

  if (isOverdue(d)) return 'text-red-500'
  if (isDueToday(d)) return 'text-yellow-500'

  return 'text-gray-500'
}

/**
 * Format a date for input fields (datetime-local)
 */
export function formatForInput(date: string | Date | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

/**
 * Get start of day as ISO string
 */
export function getStartOfDay(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return startOfDay(d).toISOString()
}

/**
 * Get end of day as ISO string
 */
export function getEndOfDay(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return endOfDay(d).toISOString()
}

/**
 * Add default event duration (1 hour) to a start time
 */
export function getDefaultEndTime(startTime: string | Date): string {
  const d = typeof startTime === 'string' ? parseISO(startTime) : startTime
  return addHours(d, 1).toISOString()
}

/**
 * Check if end time is after start time
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  return isAfter(parseISO(endTime), parseISO(startTime))
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(date: string | Date): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isAfter(d, new Date())
}

export { parseISO, isBefore, isAfter }
