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
import { toZonedTime } from 'date-fns-tz'

// Import settings store for timezone (can be used outside React context)
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Get the current timezone from settings
 */
export function getCurrentTimezone(): string {
  return useSettingsStore.getState().timezone
}

/**
 * Convert a date to the user's timezone
 */
export function toUserTimezone(date: string | Date, timezone?: string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date
  const tz = timezone ?? getCurrentTimezone()
  return toZonedTime(d, tz)
}

/**
 * Format a date for display in the UI (timezone-aware)
 */
export function formatDate(date: string | Date, formatStr = 'MMM d, yyyy', timezone?: string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const tz = timezone ?? getCurrentTimezone()
  const zonedDate = toZonedTime(d, tz)
  return format(zonedDate, formatStr)
}

/**
 * Format a time for display (timezone-aware)
 */
export function formatTime(date: string | Date, timezone?: string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const tz = timezone ?? getCurrentTimezone()
  const zonedDate = toZonedTime(d, tz)
  return format(zonedDate, 'h:mm a')
}

/**
 * Format a date and time together (timezone-aware)
 */
export function formatDateTime(date: string | Date, timezone?: string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const tz = timezone ?? getCurrentTimezone()
  const zonedDate = toZonedTime(d, tz)
  return format(zonedDate, 'MMM d, yyyy h:mm a')
}

/**
 * Format time using native Intl API (useful for displaying timezone abbreviation)
 */
export function formatTimeWithZone(date: string | Date, timezone?: string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const tz = timezone ?? getCurrentTimezone()
  return d.toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })
}

/**
 * Get a relative date string (Today, Tomorrow, Yesterday, or date) - timezone-aware
 */
export function getRelativeDate(date: string | Date, timezone?: string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const tz = timezone ?? getCurrentTimezone()
  const zonedDate = toZonedTime(d, tz)

  // Check relative to user's timezone
  if (isToday(zonedDate)) return 'Today'
  if (isTomorrow(zonedDate)) return 'Tomorrow'
  if (isYesterday(zonedDate)) return 'Yesterday'

  return format(zonedDate, 'MMM d')
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

/**
 * Get a date in user's timezone as YYYY-MM-DD
 * This avoids UTC conversion issues with toISOString()
 */
export function getLocalDateString(date: Date = new Date(), timezone?: string): string {
  const tz = timezone ?? getCurrentTimezone()
  const zonedDate = toZonedTime(date, tz)
  const year = zonedDate.getFullYear()
  const month = String(zonedDate.getMonth() + 1).padStart(2, '0')
  const day = String(zonedDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get today's date as YYYY-MM-DD in user's timezone
 */
export function getTodayString(timezone?: string): string {
  return getLocalDateString(new Date(), timezone)
}

export { parseISO, isBefore, isAfter }
