import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useItemStore } from '@/stores/itemStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { formatForInput } from '@/lib/dateUtils'
import DependencyPicker from './DependencyPicker'
import type { Item } from '@/types'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  category_id: z.string().nullable(),
  due_date: z.string().nullable(),
  parent_id: z.string().nullable(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskFormProps {
  item?: Item
  onSuccess: () => void
}

export default function TaskForm({ item, onSuccess }: TaskFormProps) {
  const { items, createItem, updateItem, dependencies, addDependency, removeDependency, getSubtasks } = useItemStore()
  const { categories } = useCategoryStore()

  // Get potential parent tasks (tasks that aren't subtasks of this item)
  const potentialParents = items.filter((i) => {
    // Must be a task
    if (i.type !== 'task') return false
    // Can't be itself
    if (item && i.id === item.id) return false
    // Can't be a subtask of the current item (would create a cycle)
    if (item) {
      const subtasks = getSubtasks(item.id)
      if (subtasks.some((s) => s.id === i.id)) return false
    }
    return true
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: item?.title || '',
      description: item?.description || '',
      category_id: item?.category_id || null,
      due_date: item?.due_date ? formatForInput(item.due_date) : null,
      parent_id: item?.parent_id || null,
    },
  })

  const currentDependencies = item
    ? dependencies.filter((d) => d.successor_id === item.id).map((d) => d.predecessor_id)
    : []

  const onSubmit = async (data: TaskFormData) => {
    const itemData = {
      type: 'task' as const,
      title: data.title,
      description: data.description || null,
      category_id: data.category_id || null,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      parent_id: data.parent_id || null,
    }

    if (item) {
      await updateItem(item.id, itemData)
    } else {
      await createItem(itemData)
    }

    onSuccess()
  }

  const handleDependencyChange = async (predecessorIds: string[]) => {
    if (!item) return

    // Find added and removed dependencies
    const added = predecessorIds.filter((id) => !currentDependencies.includes(id))
    const removed = currentDependencies.filter((id) => !predecessorIds.includes(id))

    // Apply changes
    for (const predId of added) {
      await addDependency(predId, item.id)
    }
    for (const predId of removed) {
      await removeDependency(predId, item.id)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Title *
        </label>
        <input
          type="text"
          {...register('title')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="What needs to be done?"
        />
        {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          {...register('description')}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Add more details..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Category
          </label>
          <select
            {...register('category_id')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Due Date
          </label>
          <input
            type="datetime-local"
            {...register('due_date')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Parent Task Selector */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Parent Task
          <span className="ml-1 text-xs text-gray-500">(optional - makes this a subtask)</span>
        </label>
        <select
          {...register('parent_id')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">No parent (top-level task)</option>
          {potentialParents.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </div>

      {item && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Dependencies
          </label>
          <DependencyPicker
            taskId={item.id}
            selectedIds={currentDependencies}
            onChange={handleDependencyChange}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onSuccess}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : item ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  )
}
