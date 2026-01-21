import { Draggable } from '@hello-pangea/dnd'
import type { Item, Category } from '@/types'
import clsx from 'clsx'

interface PlannerCardProps {
  item: Item
  index: number
  category: Category | null
  isPreview?: boolean
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '30m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function getTimeFromItem(item: Item): string {
  if (item.type === 'event' && item.start_time) {
    const timePart = item.start_time.split('T')[1]
    if (timePart) {
      return timePart.substring(0, 5)
    }
  }
  if (item.type === 'task' && item.scheduled_start) {
    return item.scheduled_start
  }
  return ''
}

export default function PlannerCard({ item, index, category, isPreview }: PlannerCardProps) {
  const time = getTimeFromItem(item)
  const duration = item.duration_minutes || 30
  const isEvent = item.type === 'event'

  return (
    <Draggable draggableId={item.id} index={index} isDragDisabled={isEvent}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            'group flex-1 min-w-[200px] max-w-[300px] rounded-lg px-3 py-2 transition-all-fast',
            isEvent
              ? 'bg-theme-accent-primary/20 border border-theme-accent-primary/30'
              : 'bg-theme-bg-card border border-theme-border-primary hover:border-theme-accent-primary hover:shadow-md',
            snapshot.isDragging && 'rotate-2 shadow-lg scale-105',
            isPreview && 'border-2 border-dashed border-theme-accent-success bg-theme-accent-success/10',
            !isEvent && 'cursor-grab active:cursor-grabbing'
          )}
          style={{
            ...provided.draggableProps.style,
            borderLeftColor: category?.color,
            borderLeftWidth: category ? '4px' : undefined,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            {/* Title and category */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isEvent && (
                  <svg className="h-4 w-4 shrink-0 text-theme-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                <span className={clsx(
                  'font-medium truncate',
                  item.completed ? 'line-through text-theme-text-muted' : 'text-theme-text-primary'
                )}>
                  {item.title}
                </span>
              </div>

              {category && (
                <div className="flex items-center gap-1 mt-1">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-xs text-theme-text-muted truncate">
                    {category.name}
                  </span>
                </div>
              )}
            </div>

            {/* Time and duration */}
            <div className="shrink-0 text-right">
              {time && (
                <div className="text-xs font-medium text-theme-text-secondary">
                  {time}
                </div>
              )}
              <div className="text-xs text-theme-text-muted">
                {formatDuration(duration)}
              </div>
            </div>
          </div>

          {/* Drag indicator for tasks */}
          {!isEvent && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
              <svg className="h-4 w-4 text-theme-text-muted" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="9" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" />
                <circle cx="15" cy="6" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="15" cy="18" r="1.5" />
              </svg>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}
