import { useEffect, useRef, useMemo } from 'react'
import { useItemStore } from '@/stores/itemStore'
import { useViewStore } from '@/stores/viewStore'
import { useThemeStore } from '@/stores/themeStore'
import { getDirectPredecessors } from '@/lib/dependencyUtils'

// We'll dynamically import Frappe Gantt since it's a browser-only library
let Gantt: typeof import('frappe-gantt').default | null = null

export default function GanttView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const ganttRef = useRef<unknown>(null)
  const { items, dependencies, updateItem } = useItemStore()
  const { filters, openViewItemModal } = useViewStore()
  const getFilteredItems = useItemStore((state) => state.getFilteredItems)
  const theme = useThemeStore((state) => state.theme)

  const filteredItems = useMemo(() => getFilteredItems(filters), [getFilteredItems, filters, items])

  // Filter to items that have dates
  const ganttItems = useMemo(() => {
    return filteredItems.filter((item) => item.start_time || item.due_date)
  }, [filteredItems])

  // Convert to Frappe Gantt format
  const ganttTasks = useMemo(() => {
    return ganttItems.map((item) => {
      const predecessorIds = getDirectPredecessors(dependencies, item.id)
      const start = item.start_time || item.due_date
      const end = item.end_time || item.due_date || item.start_time

      return {
        id: item.id,
        name: item.title,
        start: start ? new Date(start).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        end: end ? new Date(end).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        progress: item.completed ? 100 : 0,
        dependencies: predecessorIds.join(', '),
        custom_class: item.category?.color ? `gantt-${item.category_id}` : '',
      }
    })
  }, [ganttItems, dependencies])

  useEffect(() => {
    const loadGantt = async () => {
      if (!Gantt) {
        const module = await import('frappe-gantt')
        Gantt = module.default
      }

      if (!containerRef.current || ganttTasks.length === 0) return

      // Clear previous instance
      if (ganttRef.current) {
        containerRef.current.innerHTML = ''
      }

      // Create SVG container
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.id = 'gantt-svg'
      containerRef.current.appendChild(svg)

      ganttRef.current = new Gantt('#gantt-svg', ganttTasks, {
        view_mode: 'Day',
        date_format: 'YYYY-MM-DD',
        on_click: (task: { id: string }) => {
          openViewItemModal(task.id)
        },
        on_date_change: async (task: { id: string }, start: Date, end: Date) => {
          await updateItem(task.id, {
            start_time: start.toISOString(),
            end_time: end.toISOString(),
          })
        },
        on_progress_change: async (task: { id: string }, progress: number) => {
          const completed = progress >= 100
          await updateItem(task.id, {
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          })
        },
      })
    }

    loadGantt()
  }, [ganttTasks, openViewItemModal, updateItem, theme])

  if (ganttItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center animate-fade-in">
        <div className="text-center text-theme-text-muted">
          <svg
            className="mx-auto h-16 w-16 text-theme-text-muted opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="mt-4 text-lg font-medium text-theme-text-secondary">No items with dates to display</p>
          <p className="mt-1 text-sm">Add due dates or start times to see them in the Gantt view</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-theme-bg-card p-4 shadow-card border border-theme-border-primary transition-theme animate-fade-in">
      <div ref={containerRef} className="gantt-container overflow-x-auto" />
    </div>
  )
}
