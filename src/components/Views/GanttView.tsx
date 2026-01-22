import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useItemStore } from '@/stores/itemStore'
import { useViewStore } from '@/stores/viewStore'
import { useThemeStore } from '@/stores/themeStore'
import { useProjectStore } from '@/stores/projectStore'
import { getDirectPredecessors } from '@/lib/dependencyUtils'
import type { Item, Project, Dependency } from '@/types'

// We'll dynamically import Frappe Gantt since it's a browser-only library
let Gantt: typeof import('frappe-gantt').default | null = null

interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  dependencies: string
  custom_class: string
}

// Component to render a single Gantt chart
function GanttChart({
  containerId,
  tasks,
  onTaskClick,
  onDateChange,
  onProgressChange,
}: {
  containerId: string
  tasks: GanttTask[]
  onTaskClick: (taskId: string) => void
  onDateChange: (taskId: string, start: Date, end: Date) => void
  onProgressChange: (taskId: string, progress: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ganttRef = useRef<unknown>(null)
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    const loadGantt = async () => {
      if (!Gantt) {
        const module = await import('frappe-gantt')
        Gantt = module.default
      }

      if (!containerRef.current || tasks.length === 0) return

      // Clear previous instance
      if (ganttRef.current) {
        containerRef.current.innerHTML = ''
      }

      // Create SVG container
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.id = containerId
      containerRef.current.appendChild(svg)

      ganttRef.current = new Gantt(`#${containerId}`, tasks, {
        view_mode: 'Day',
        date_format: 'YYYY-MM-DD',
        on_click: (task: { id: string }) => {
          onTaskClick(task.id)
        },
        on_date_change: async (task: { id: string }, start: Date, end: Date) => {
          onDateChange(task.id, start, end)
        },
        on_progress_change: async (task: { id: string }, progress: number) => {
          onProgressChange(task.id, progress)
        },
      })
    }

    loadGantt()
  }, [containerId, tasks, onTaskClick, onDateChange, onProgressChange, theme])

  if (tasks.length === 0) {
    return (
      <div className="py-4 text-center text-theme-text-muted text-sm">
        No tasks with dates in this section
      </div>
    )
  }

  return <div ref={containerRef} className="gantt-container overflow-x-auto" />
}

// Project section component
function ProjectSection({
  project,
  items,
  dependencies,
  onTaskClick,
  onDateChange,
  onProgressChange,
}: {
  project: Project
  items: Item[]
  dependencies: Dependency[]
  onTaskClick: (taskId: string) => void
  onDateChange: (taskId: string, start: Date, end: Date) => void
  onProgressChange: (taskId: string, progress: number) => void
}) {
  const [expanded, setExpanded] = useState(true)

  const tasks = useMemo(() => {
    return items.map((item) => {
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
  }, [items, dependencies])

  const completedCount = items.filter((i) => i.completed).length
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

  return (
    <div className="rounded-xl bg-theme-bg-card shadow-card border border-theme-border-primary transition-theme animate-fade-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-theme-bg-hover transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <svg className="h-5 w-5 text-theme-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-theme-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <svg className="h-5 w-5 text-theme-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="font-semibold text-theme-text-primary">{project.title}</span>
          <span className="text-sm text-theme-text-muted">
            ({items.length} task{items.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-4">
          {project.target_date && (
            <span className="text-sm text-theme-text-muted">
              Due: {new Date(project.target_date).toLocaleDateString()}
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-theme-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-theme-accent-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-theme-text-muted w-10">{progress}%</span>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="p-4 pt-0 border-t border-theme-border-primary">
          <GanttChart
            containerId={`gantt-project-${project.id}`}
            tasks={tasks}
            onTaskClick={onTaskClick}
            onDateChange={onDateChange}
            onProgressChange={onProgressChange}
          />
        </div>
      )}
    </div>
  )
}

export default function GanttView() {
  const { items, dependencies, updateItem } = useItemStore()
  const { filters, openViewItemModal } = useViewStore()
  const { projects, fetchProjects } = useProjectStore()
  const getFilteredItems = useItemStore((state) => state.getFilteredItems)

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filteredItems = useMemo(() => getFilteredItems(filters), [getFilteredItems, filters, items])

  // Filter to items that have dates and are not completed
  const ganttItems = useMemo(() => {
    return filteredItems.filter((item) =>
      !item.completed && (item.start_time || item.due_date)
    )
  }, [filteredItems])

  // Group items by project
  const { unassignedItems, projectGroups } = useMemo(() => {
    const unassigned: Item[] = []
    const byProject: Record<string, Item[]> = {}

    for (const item of ganttItems) {
      if (item.project_id) {
        if (!byProject[item.project_id]) {
          byProject[item.project_id] = []
        }
        byProject[item.project_id].push(item)
      } else {
        unassigned.push(item)
      }
    }

    return { unassignedItems: unassigned, projectGroups: byProject }
  }, [ganttItems])

  // Get active projects that have items
  const activeProjects = useMemo(() => {
    return projects.filter((p) => p.status === 'active' && projectGroups[p.id]?.length > 0)
  }, [projects, projectGroups])

  // Convert unassigned items to Frappe Gantt format
  const mainGanttTasks = useMemo(() => {
    return unassignedItems.map((item) => {
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
  }, [unassignedItems, dependencies])

  const handleTaskClick = useCallback((taskId: string) => {
    openViewItemModal(taskId)
  }, [openViewItemModal])

  const handleDateChange = useCallback(async (taskId: string, start: Date, end: Date) => {
    await updateItem(taskId, {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    })
  }, [updateItem])

  const handleProgressChange = useCallback(async (taskId: string, progress: number) => {
    const completed = progress >= 100
    await updateItem(taskId, {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
  }, [updateItem])

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
    <div className="space-y-4 animate-fade-in">
      {/* Main Gantt (unassigned items) */}
      {mainGanttTasks.length > 0 && (
        <div className="rounded-xl bg-theme-bg-card p-4 shadow-card border border-theme-border-primary transition-theme">
          <h3 className="text-sm font-medium text-theme-text-muted mb-3 flex items-center gap-2">
            <span>Tasks</span>
            <span className="text-xs">({mainGanttTasks.length})</span>
          </h3>
          <GanttChart
            containerId="gantt-main"
            tasks={mainGanttTasks}
            onTaskClick={handleTaskClick}
            onDateChange={handleDateChange}
            onProgressChange={handleProgressChange}
          />
        </div>
      )}

      {/* Project Breakout Gantts */}
      {activeProjects.map((project) => (
        <ProjectSection
          key={project.id}
          project={project}
          items={projectGroups[project.id] || []}
          dependencies={dependencies}
          onTaskClick={handleTaskClick}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
        />
      ))}
    </div>
  )
}
