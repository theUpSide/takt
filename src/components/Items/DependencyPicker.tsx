import { useState, useMemo } from 'react'
import { useItemStore } from '@/stores/itemStore'
import { getInvalidPredecessors } from '@/lib/dependencyUtils'
import clsx from 'clsx'

interface DependencyPickerProps {
  taskId: string
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export default function DependencyPicker({ taskId, selectedIds, onChange }: DependencyPickerProps) {
  const { items, dependencies } = useItemStore()
  const [search, setSearch] = useState('')

  // Get tasks that cannot be selected (would create cycles)
  const invalidIds = useMemo(
    () => getInvalidPredecessors(dependencies, taskId),
    [dependencies, taskId]
  )

  // Filter to incomplete tasks only (excluding current task and invalid predecessors)
  const availableTasks = useMemo(() => {
    return items.filter((item) => {
      if (item.type !== 'task') return false
      if (item.id === taskId) return false
      if (item.completed) return false
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [items, taskId, search])

  const handleToggle = (id: string) => {
    if (invalidIds.has(id)) return

    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter((s) => s !== id))
  }

  const selectedTasks = items.filter((i) => selectedIds.includes(i.id))

  return (
    <div className="space-y-3">
      {/* Selected dependencies */}
      {selectedTasks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTasks.map((task) => (
            <span
              key={task.id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {task.title}
              <button
                type="button"
                onClick={() => handleRemove(task.id)}
                className="ml-1 hover:text-blue-900"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tasks..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />

      {/* Available tasks */}
      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
        {availableTasks.length === 0 ? (
          <div className="p-3 text-center text-sm text-gray-500">No tasks available</div>
        ) : (
          availableTasks.map((task) => {
            const isInvalid = invalidIds.has(task.id)
            const isSelected = selectedIds.includes(task.id)

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => handleToggle(task.id)}
                disabled={isInvalid}
                className={clsx(
                  'flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm last:border-0 dark:border-gray-700',
                  isInvalid
                    ? 'cursor-not-allowed bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                    : isSelected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                <span
                  className={clsx(
                    'h-4 w-4 shrink-0 rounded border-2',
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-500'
                  )}
                >
                  {isSelected && (
                    <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
                <span className="flex-1 truncate">{task.title}</span>
                {isInvalid && (
                  <span className="text-xs text-gray-400">Would create cycle</span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
