import { useState, useMemo } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { useItemStore } from '@/stores/itemStore'
import { useAIStore } from '@/stores/aiStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { getTodayString } from '@/lib/dateUtils'
import TimeGrid from './TimeGrid'
import UnscheduledPanel from './UnscheduledPanel'
import DateNavigator from './DateNavigator'
import OptimizationPreview from './OptimizationPreview'
import clsx from 'clsx'

interface ScheduleSuggestion {
  item_id: string
  scheduled_start: string
  duration_minutes: number
}

interface OptimizationResult {
  schedule: ScheduleSuggestion[]
  reasoning: string
}

export default function DailyPlannerView() {
  const [selectedDate, setSelectedDate] = useState(() => getTodayString())
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationPreview, setOptimizationPreview] = useState<OptimizationResult | null>(null)

  const { items, getItemsForDate, getUnscheduledTasks, scheduleItem, unscheduleItem } = useItemStore()
  const { optimizeSchedule, apiKey } = useAIStore()
  const { categories } = useCategoryStore()

  // Get items for the selected date
  const scheduledItems = useMemo(() => {
    return getItemsForDate(selectedDate)
  }, [getItemsForDate, selectedDate, items])

  // Get unscheduled tasks
  const unscheduledTasks = useMemo(() => {
    return getUnscheduledTasks()
  }, [getUnscheduledTasks, items])

  // Handle drag end
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    // Dropped outside a valid area
    if (!destination) return

    // Dropped in the same place
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const itemId = draggableId

    // From unscheduled to time slot
    if (source.droppableId === 'unscheduled' && destination.droppableId.startsWith('slot-')) {
      const hour = parseInt(destination.droppableId.replace('slot-', ''), 10)
      const startTime = `${hour.toString().padStart(2, '0')}:00`
      await scheduleItem(itemId, selectedDate, startTime)
    }
    // From time slot to unscheduled
    else if (source.droppableId.startsWith('slot-') && destination.droppableId === 'unscheduled') {
      await unscheduleItem(itemId)
    }
    // From time slot to time slot
    else if (source.droppableId.startsWith('slot-') && destination.droppableId.startsWith('slot-')) {
      const hour = parseInt(destination.droppableId.replace('slot-', ''), 10)
      const startTime = `${hour.toString().padStart(2, '0')}:00`
      await scheduleItem(itemId, selectedDate, startTime)
    }
  }

  // Handle AI optimization
  const handleOptimize = async () => {
    if (!apiKey) {
      return
    }

    setIsOptimizing(true)
    try {
      const result = await optimizeSchedule(selectedDate, scheduledItems, unscheduledTasks)
      if (result) {
        setOptimizationPreview(result)
      }
    } finally {
      setIsOptimizing(false)
    }
  }

  // Apply optimization suggestions
  const handleApplyOptimization = async () => {
    if (!optimizationPreview) return

    for (const suggestion of optimizationPreview.schedule) {
      await scheduleItem(
        suggestion.item_id,
        selectedDate,
        suggestion.scheduled_start,
        suggestion.duration_minutes
      )
    }

    setOptimizationPreview(null)
  }

  // Reject optimization
  const handleRejectOptimization = () => {
    setOptimizationPreview(null)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-border-primary bg-theme-bg-secondary px-4 py-3">
        <DateNavigator
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handleOptimize}
            disabled={isOptimizing || !apiKey}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all-fast btn-press',
              apiKey
                ? 'bg-gradient-to-r from-theme-accent-primary to-theme-accent-secondary text-white hover:opacity-90 shadow-md hover:shadow-glow-primary'
                : 'bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed'
            )}
            title={!apiKey ? 'Configure API key in Settings' : 'Optimize schedule with AI'}
          >
            {isOptimizing ? (
              <>
                <svg className="h-4 w-4 animate-spin\" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Optimizing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Optimize with AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          {/* Time grid - main area */}
          <div className="flex-1 overflow-auto">
            <TimeGrid
              date={selectedDate}
              items={scheduledItems}
              categories={categories}
              isOptimizing={isOptimizing}
              previewSchedule={optimizationPreview?.schedule}
            />
          </div>

          {/* Unscheduled panel - sidebar */}
          <UnscheduledPanel
            tasks={unscheduledTasks}
            categories={categories}
          />
        </div>
      </DragDropContext>

      {/* Optimization preview modal */}
      {optimizationPreview && (
        <OptimizationPreview
          schedule={optimizationPreview.schedule}
          reasoning={optimizationPreview.reasoning}
          items={items}
          onApply={handleApplyOptimization}
          onReject={handleRejectOptimization}
        />
      )}
    </div>
  )
}
