import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useItemStore } from '@/stores/itemStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { formatForInput, getDefaultEndTime, isValidTimeRange } from '@/lib/dateUtils'
import type { Item } from '@/types'

const eventSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(2000).optional(),
    category_id: z.string().nullable(),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
  })
  .refine((data) => isValidTimeRange(data.start_time, data.end_time), {
    message: 'End time must be after start time',
    path: ['end_time'],
  })

type EventFormData = z.infer<typeof eventSchema>

interface EventFormProps {
  item?: Item
  onSuccess: () => void
}

export default function EventForm({ item, onSuccess }: EventFormProps) {
  const { createItem, updateItem } = useItemStore()
  const { categories } = useCategoryStore()

  const defaultStart = formatForInput(new Date())
  const defaultEnd = formatForInput(getDefaultEndTime(new Date()))

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: item?.title || '',
      description: item?.description || '',
      category_id: item?.category_id || null,
      start_time: item?.start_time ? formatForInput(item.start_time) : defaultStart,
      end_time: item?.end_time ? formatForInput(item.end_time) : defaultEnd,
    },
  })

  // Auto-update end time when start time changes (maintain 1 hour duration)
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value
    if (newStart) {
      const newEnd = formatForInput(getDefaultEndTime(newStart))
      setValue('end_time', newEnd)
    }
  }

  const onSubmit = async (data: EventFormData) => {
    const itemData = {
      type: 'event' as const,
      title: data.title,
      description: data.description || null,
      category_id: data.category_id || null,
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
    }

    if (item) {
      await updateItem(item.id, itemData)
    } else {
      await createItem(itemData)
    }

    onSuccess()
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
          placeholder="Event name"
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
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Time *
          </label>
          <input
            type="datetime-local"
            {...register('start_time', { onChange: handleStartTimeChange })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          {errors.start_time && (
            <p className="mt-1 text-sm text-red-500">{errors.start_time.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            End Time *
          </label>
          <input
            type="datetime-local"
            {...register('end_time')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          {errors.end_time && <p className="mt-1 text-sm text-red-500">{errors.end_time.message}</p>}
        </div>
      </div>

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
          {isSubmitting ? 'Saving...' : item ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </form>
  )
}
