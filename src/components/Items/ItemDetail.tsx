import { useItemStore } from '@/stores/itemStore'
import { useViewStore } from '@/stores/viewStore'
import { formatDateTime, getRelativeTime } from '@/lib/dateUtils'
import { getDirectPredecessors, getDirectSuccessors } from '@/lib/dependencyUtils'
import CategoryBadge from '@/components/Common/CategoryBadge'
import ProgressRing from '@/components/Common/ProgressRing'
import SubtaskList from './SubtaskList'
import type { Item } from '@/types'

interface ItemDetailProps {
  item: Item
}

export default function ItemDetail({ item }: ItemDetailProps) {
  const { items, dependencies, toggleComplete, deleteItem, getSubtasks, getSubtaskProgress, getParent } = useItemStore()
  const { openEditItemModal, closeItemModal, openViewItemModal } = useViewStore()

  const predecessorIds = getDirectPredecessors(dependencies, item.id)
  const successorIds = getDirectSuccessors(dependencies, item.id)

  const predecessors = items.filter((i) => predecessorIds.includes(i.id))
  const successors = items.filter((i) => successorIds.includes(i.id))

  // Subtask data
  const subtasks = getSubtasks(item.id)
  const subtaskProgress = getSubtaskProgress(item.id)
  const parentItem = getParent(item.id)

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteItem(item.id)
      closeItemModal()
    }
  }

  const handleEdit = () => {
    openEditItemModal(item.id)
  }

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-start gap-4">
        {item.type === 'task' && (
          <button
            onClick={() => toggleComplete(item.id)}
            className={`mt-1 h-5 w-5 shrink-0 rounded border-2 transition-colors ${
              item.completed
                ? 'border-green-500 bg-green-500'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {item.completed && (
              <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        )}
        <div className="flex-1">
          <h2
            className={`text-xl font-semibold ${
              item.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'
            }`}
          >
            {item.title}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                item.type === 'task'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
              }`}
            >
              {item.type}
            </span>
            {item.category && <CategoryBadge color={item.category.color} name={item.category.name} />}
          </div>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <div>
          <h3 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
          <p className="text-gray-900 dark:text-white">{item.description}</p>
        </div>
      )}

      {/* Parent Task */}
      {parentItem && (
        <div className="rounded-lg bg-theme-bg-tertiary/50 p-3">
          <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            Parent Task
          </h3>
          <button
            onClick={() => openViewItemModal(parentItem.id)}
            className="flex items-center gap-2 text-sm text-theme-accent-primary hover:text-theme-accent-primary/80 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            {parentItem.title}
          </button>
        </div>
      )}

      {/* Subtasks */}
      {item.type === 'task' && (
        <div>
          {subtasks.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <ProgressRing percentage={subtaskProgress.percentage} size="lg" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {subtaskProgress.completed} of {subtaskProgress.total} subtasks complete
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {subtaskProgress.percentage}% progress
                </p>
              </div>
            </div>
          )}
          <SubtaskList parentId={item.id} />
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        {item.type === 'event' && item.start_time && (
          <div>
            <h3 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Start</h3>
            <p className="text-gray-900 dark:text-white">{formatDateTime(item.start_time)}</p>
          </div>
        )}
        {item.type === 'event' && item.end_time && (
          <div>
            <h3 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">End</h3>
            <p className="text-gray-900 dark:text-white">{formatDateTime(item.end_time)}</p>
          </div>
        )}
        {item.type === 'task' && item.due_date && (
          <div>
            <h3 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</h3>
            <p className="text-gray-900 dark:text-white">{formatDateTime(item.due_date)}</p>
          </div>
        )}
        {item.completed_at && (
          <div>
            <h3 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Completed</h3>
            <p className="text-gray-900 dark:text-white">{formatDateTime(item.completed_at)}</p>
          </div>
        )}
      </div>

      {/* Dependencies */}
      {(predecessors.length > 0 || successors.length > 0) && (
        <div className="space-y-3">
          {predecessors.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Depends on
              </h3>
              <div className="space-y-1">
                {predecessors.map((pred) => (
                  <div
                    key={pred.id}
                    className="flex items-center gap-2 rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-700"
                  >
                    <span
                      className={pred.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}
                    >
                      {pred.title}
                    </span>
                    {pred.completed && (
                      <span className="text-xs text-green-500">Completed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {successors.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Blocks
              </h3>
              <div className="space-y-1">
                {successors.map((succ) => (
                  <div
                    key={succ.id}
                    className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-900 dark:bg-gray-700 dark:text-white"
                  >
                    {succ.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Source info */}
      {item.source !== 'manual' && (
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
          <h3 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
            Source: {item.source.toUpperCase()}
          </h3>
          {item.raw_sms && (
            <p className="text-sm italic text-gray-600 dark:text-gray-300">"{item.raw_sms}"</p>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="text-xs text-gray-400">
        Created {getRelativeTime(item.created_at)}
        {item.updated_at !== item.created_at && ` · Updated ${getRelativeTime(item.updated_at)}`}
      </div>

      {/* Actions */}
      <div className="flex justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
        <button
          onClick={handleDelete}
          className="text-sm text-red-500 hover:text-red-600"
        >
          Delete
        </button>
        <div className="flex gap-2">
          <button
            onClick={closeItemModal}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Close
          </button>
          <button
            onClick={handleEdit}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}
