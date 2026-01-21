import { useItemStore } from '@/stores/itemStore'
import { useViewStore } from '@/stores/viewStore'
import { getRelativeDate, isOverdue } from '@/lib/dateUtils'
import { getDirectPredecessors } from '@/lib/dependencyUtils'
import Checkbox from '@/components/Common/Checkbox'
import type { Item } from '@/types'
import clsx from 'clsx'

interface KanbanCardProps {
  item: Item
  isDragging: boolean
}

export default function KanbanCard({ item, isDragging }: KanbanCardProps) {
  const { toggleComplete, dependencies } = useItemStore()
  const { openViewItemModal } = useViewStore()

  const predecessors = getDirectPredecessors(dependencies, item.id)
  const dueDate = item.due_date || item.start_time
  const overdue = item.due_date ? isOverdue(item.due_date) : false

  const handleCardClick = () => {
    openViewItemModal(item.id)
  }

  return (
    <div
      onClick={handleCardClick}
      className={clsx(
        'cursor-pointer rounded-lg bg-theme-bg-card p-3 border border-theme-border-primary card-hover transition-all-fast',
        isDragging && 'shadow-card-lg ring-2 ring-theme-accent-primary',
        overdue && !item.completed && 'border-theme-accent-danger/50 overdue-glow',
        item.completed && 'opacity-70'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox for tasks */}
        {item.type === 'task' && (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={item.completed}
              onChange={() => toggleComplete(item.id)}
              className="mt-0.5"
            />
          </div>
        )}

        {/* Title */}
        <h4
          className={clsx(
            'flex-1 text-sm font-medium leading-snug',
            item.completed
              ? 'text-theme-text-muted line-through'
              : 'text-theme-text-primary'
          )}
        >
          {item.title}
        </h4>
      </div>

      {/* Meta info */}
      <div className="mt-2 flex items-center gap-2 text-xs">
        {/* Due date / time */}
        {dueDate && (
          <span
            className={clsx(
              'flex items-center gap-1 rounded-md px-2 py-0.5 font-medium',
              item.completed
                ? 'text-theme-text-muted bg-theme-bg-tertiary'
                : overdue
                ? 'text-theme-accent-danger bg-theme-accent-danger/10'
                : 'text-theme-accent-warning bg-theme-accent-warning/10'
            )}
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {getRelativeDate(dueDate)}
          </span>
        )}

        {/* Source indicator */}
        {item.source !== 'manual' && (
          <span className="text-theme-text-muted">
            {item.source === 'sms' ? (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </span>
        )}

        {/* Dependencies */}
        {predecessors.length > 0 && (
          <span className="flex items-center gap-1 text-theme-text-muted">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            {predecessors.length}
          </span>
        )}

        {/* Type indicator for events */}
        {item.type === 'event' && (
          <span className="ml-auto rounded-md bg-theme-accent-secondary/20 px-2 py-0.5 font-medium text-theme-accent-secondary">
            Event
          </span>
        )}
      </div>
    </div>
  )
}
