import { Droppable } from '@hello-pangea/dnd'
import type { Item, Category } from '@/types'
import PlannerCard from './PlannerCard'
import clsx from 'clsx'

interface ScheduleSuggestion {
  item_id: string
  scheduled_start: string
  duration_minutes: number
}

interface TimeSlotProps {
  hour: number
  items: Item[]
  getCategoryById: (id: string | null) => Category | null
  isPast: boolean
  isCurrent: boolean
  previewItems?: ScheduleSuggestion[]
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:00 ${ampm}`
}

export default function TimeSlot({ hour, items, getCategoryById, isPast, isCurrent, previewItems }: TimeSlotProps) {
  return (
    <Droppable droppableId={`slot-${hour}`}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={clsx(
            'flex border-b border-theme-border-primary transition-all-fast',
            isPast && 'opacity-60',
            isCurrent && 'bg-theme-accent-primary/5',
            snapshot.isDraggingOver && 'bg-theme-accent-primary/10 border-theme-accent-primary'
          )}
          style={{ minHeight: '60px' }}
        >
          {/* Time label */}
          <div className={clsx(
            'w-20 shrink-0 px-3 py-2 text-sm font-medium border-r border-theme-border-primary',
            isPast ? 'text-theme-text-muted' : 'text-theme-text-secondary'
          )}>
            {formatHour(hour)}
          </div>

          {/* Items area */}
          <div className="flex-1 p-2 flex flex-wrap gap-2 min-h-[60px]">
            {items.map((item, index) => (
              <PlannerCard
                key={item.id}
                item={item}
                index={index}
                category={getCategoryById(item.category_id)}
                isPreview={false}
              />
            ))}

            {/* Preview items (AI suggestions) */}
            {previewItems?.map((preview) => (
              <div
                key={`preview-${preview.item_id}`}
                className="flex-1 min-w-[200px] max-w-[300px] h-12 rounded-lg border-2 border-dashed border-theme-accent-success bg-theme-accent-success/10 flex items-center justify-center text-sm text-theme-accent-success animate-pulse"
              >
                AI Suggestion
              </div>
            ))}

            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  )
}
