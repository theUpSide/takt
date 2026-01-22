import { useState, useMemo } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import type { Item, Category } from '@/types'
import clsx from 'clsx'

interface UnscheduledPanelProps {
  tasks: Item[]
  categories: Category[]
  isExpanded?: boolean
  onToggleExpand?: () => void
  isMobile?: boolean
}

export default function UnscheduledPanel({ tasks, categories, isExpanded = true, onToggleExpand, isMobile = false }: UnscheduledPanelProps) {
  const [searchFilter, setSearchFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    if (searchFilter) {
      const search = searchFilter.toLowerCase()
      filtered = filtered.filter(
        task => task.title.toLowerCase().includes(search)
      )
    }

    if (categoryFilter) {
      filtered = filtered.filter(task => task.category_id === categoryFilter)
    }

    return filtered
  }, [tasks, searchFilter, categoryFilter])

  // Get category by ID
  const getCategoryById = (categoryId: string | null) => {
    if (!categoryId) return null
    return categories.find(c => c.id === categoryId) ?? null
  }

  return (
    <div className={clsx(
      'shrink-0 border-theme-border-primary bg-theme-bg-secondary flex flex-col',
      // Mobile: full width, border-top, collapsible height
      'w-full border-t md:border-t-0 md:border-l md:w-72',
      // Mobile collapsed: show only header
      isMobile && !isExpanded && 'max-h-14',
      // Mobile expanded: take remaining space
      isMobile && isExpanded && 'flex-1 min-h-[200px]'
    )}>
      {/* Header - clickable on mobile to toggle */}
      <div
        className={clsx(
          'p-3 border-b border-theme-border-primary',
          isMobile && 'cursor-pointer active:bg-theme-bg-hover'
        )}
        onClick={isMobile ? onToggleExpand : undefined}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-theme-text-primary">
            To Schedule
            <span className="ml-2 text-theme-text-muted font-normal">
              ({filteredTasks.length})
            </span>
          </h3>
          {/* Mobile expand/collapse indicator */}
          {isMobile && (
            <svg
              className={clsx(
                'h-4 w-4 text-theme-text-muted transition-transform',
                isExpanded && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </div>

        {/* Search - hidden when collapsed on mobile */}
        {(!isMobile || isExpanded) && (
          <>
            <div className="relative mb-2 mt-2">
              <svg
                className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Filter tasks..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full rounded-md border border-theme-border-primary bg-theme-bg-primary pl-8 pr-3 py-1.5 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-accent-primary focus:border-transparent"
              />
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setCategoryFilter(null)}
                className={clsx(
                  'px-2 py-0.5 rounded text-xs font-medium transition-all-fast',
                  categoryFilter === null
                    ? 'bg-theme-accent-primary text-white'
                    : 'bg-theme-bg-tertiary text-theme-text-secondary hover:bg-theme-bg-hover'
                )}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={clsx(
                    'px-2 py-0.5 rounded text-xs font-medium transition-all-fast flex items-center gap-1',
                    categoryFilter === cat.id
                      ? 'bg-theme-accent-primary text-white'
                      : 'bg-theme-bg-tertiary text-theme-text-secondary hover:bg-theme-bg-hover'
                  )}
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Task list - hidden when collapsed on mobile */}
      {(!isMobile || isExpanded) && (
      <Droppable droppableId="unscheduled">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={clsx(
              'flex-1 overflow-auto p-2 space-y-2 transition-all-fast',
              snapshot.isDraggingOver && 'bg-theme-accent-primary/5'
            )}
          >
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-theme-text-muted">
                {tasks.length === 0 ? (
                  <>
                    <svg className="h-8 w-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    All tasks scheduled!
                  </>
                ) : (
                  <>No tasks match filter</>
                )}
              </div>
            ) : (
              filteredTasks.map((task, index) => {
                const category = getCategoryById(task.category_id)

                return (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={clsx(
                          'group rounded-lg border bg-theme-bg-card px-3 py-2 transition-all-fast cursor-grab active:cursor-grabbing',
                          snapshot.isDragging
                            ? 'border-theme-accent-primary shadow-lg rotate-2 scale-105'
                            : 'border-theme-border-primary hover:border-theme-accent-primary hover:shadow-md'
                        )}
                        style={{
                          ...provided.draggableProps.style,
                          borderLeftColor: category?.color,
                          borderLeftWidth: category ? '4px' : undefined,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-theme-text-primary truncate block">
                              {task.title}
                            </span>

                            <div className="flex items-center gap-2 mt-1">
                              {category && (
                                <div className="flex items-center gap-1">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  />
                                  <span className="text-xs text-theme-text-muted">
                                    {category.name}
                                  </span>
                                </div>
                              )}

                              {task.due_date && (
                                <span className="text-xs text-theme-text-muted">
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Drag indicator */}
                          <div className="opacity-0 group-hover:opacity-50 transition-opacity">
                            <svg className="h-4 w-4 text-theme-text-muted" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="9" cy="6" r="1.5" />
                              <circle cx="9" cy="12" r="1.5" />
                              <circle cx="9" cy="18" r="1.5" />
                              <circle cx="15" cy="6" r="1.5" />
                              <circle cx="15" cy="12" r="1.5" />
                              <circle cx="15" cy="18" r="1.5" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                )
              })
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      )}
    </div>
  )
}
