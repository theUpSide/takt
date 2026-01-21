import { useMemo, useEffect, useState } from 'react'
import type { Item, Category } from '@/types'
import TimeSlot from './TimeSlot'

interface ScheduleSuggestion {
  item_id: string
  scheduled_start: string
  duration_minutes: number
}

interface TimeGridProps {
  date: string
  items: Item[]
  categories: Category[]
  isOptimizing: boolean
  previewSchedule?: ScheduleSuggestion[]
}

// Default time range: 6 AM to 10 PM
const START_HOUR = 6
const END_HOUR = 22
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

export default function TimeGrid({ date, items, categories, isOptimizing, previewSchedule }: TimeGridProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Check if the selected date is today
  const isToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return date === today
  }, [date])

  // Calculate the position of the "now" indicator
  const nowPosition = useMemo(() => {
    if (!isToday) return null
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    if (hours < START_HOUR || hours >= END_HOUR) return null

    const hourOffset = hours - START_HOUR
    const minuteOffset = minutes / 60
    return ((hourOffset + minuteOffset) / HOURS.length) * 100
  }, [isToday, currentTime])

  // Group items by their starting hour
  const itemsByHour = useMemo(() => {
    const grouped: Record<number, Item[]> = {}
    HOURS.forEach(hour => {
      grouped[hour] = []
    })

    items.forEach(item => {
      let startHour: number | null = null

      // For events, parse start_time
      if (item.type === 'event' && item.start_time) {
        const timePart = item.start_time.split('T')[1]
        if (timePart) {
          startHour = parseInt(timePart.split(':')[0], 10)
        }
      }
      // For tasks, parse scheduled_start
      else if (item.type === 'task' && item.scheduled_start) {
        startHour = parseInt(item.scheduled_start.split(':')[0], 10)
      }

      if (startHour !== null && startHour >= START_HOUR && startHour < END_HOUR) {
        grouped[startHour].push(item)
      }
    })

    return grouped
  }, [items])

  // Get category by ID
  const getCategoryById = (categoryId: string | null) => {
    if (!categoryId) return null
    return categories.find(c => c.id === categoryId) ?? null
  }

  return (
    <div className="relative min-h-full">
      {/* Optimization shimmer overlay */}
      {isOptimizing && (
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-transparent via-theme-accent-primary/10 to-transparent animate-shimmer pointer-events-none" />
      )}

      {/* Time grid */}
      <div className="relative">
        {/* Now indicator */}
        {nowPosition !== null && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${nowPosition}%` }}
          >
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-theme-accent-danger shadow-glow-danger" />
              <div className="flex-1 h-0.5 bg-theme-accent-danger shadow-glow-danger" />
            </div>
          </div>
        )}

        {/* Hour rows */}
        {HOURS.map((hour) => {
          const isPast = isToday && currentTime.getHours() > hour
          const isCurrent = isToday && currentTime.getHours() === hour

          return (
            <TimeSlot
              key={hour}
              hour={hour}
              items={itemsByHour[hour]}
              getCategoryById={getCategoryById}
              isPast={isPast}
              isCurrent={isCurrent}
              previewItems={previewSchedule?.filter(s => {
                const startHour = parseInt(s.scheduled_start.split(':')[0], 10)
                return startHour === hour
              })}
            />
          )
        })}
      </div>
    </div>
  )
}
