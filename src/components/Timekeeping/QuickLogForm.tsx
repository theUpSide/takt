import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import { useItemStore } from '@/stores/itemStore'
import { getTodayString } from '@/lib/dateUtils'
import { TIME_CATEGORIES } from '@/types/timekeeping'
import type { TimeCategory, TimeEntryFormData } from '@/types/timekeeping'
import HoursStepper from './HoursStepper'
import CategoryPills from './CategoryPills'

const schema = z.object({
  entry_date: z.string().min(1, 'Date is required'),
  hours: z.number().min(0.25).max(24),
  category: z.enum([
    'product_dev', 'bd_outreach', 'client_work',
    'content', 'admin', 'professional_dev',
  ] as const),
  description: z.string(),
  task_id: z.string().nullable(),
  billable: z.boolean(),
  client_name: z.string(),
  rate_override: z.number().nullable(),
})

interface QuickLogFormProps {
  onSwitchToExpense: () => void
}

export default function QuickLogForm({ onSwitchToExpense }: QuickLogFormProps) {
  const { createTimeEntry, getDistinctClientNames } = useTimekeepingStore()
  const items = useItemStore((s) => s.items)
  const [saving, setSaving] = useState(false)
  const [lastCategory, setLastCategory] = useState<TimeCategory | null>(() => {
    try {
      return localStorage.getItem('takt-last-time-category') as TimeCategory | null
    } catch {
      return null
    }
  })

  const { control, handleSubmit, reset, watch, setValue } = useForm<TimeEntryFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      entry_date: getTodayString(),
      hours: 1,
      category: lastCategory || 'product_dev',
      description: '',
      task_id: null,
      billable: false,
      client_name: '',
      rate_override: null,
    },
  })

  const billable = watch('billable')
  const clientNames = getDistinctClientNames()
  const tasks = items.filter((i) => i.type === 'task' && !i.completed)

  const onSubmit = async (data: TimeEntryFormData) => {
    setSaving(true)
    const result = await createTimeEntry(data)
    setSaving(false)

    if (result) {
      // Remember last used category
      setLastCategory(data.category)
      try {
        localStorage.setItem('takt-last-time-category', data.category)
      } catch { /* ignore */ }

      // Reset form for next entry
      reset({
        entry_date: getTodayString(),
        hours: 1,
        category: data.category,
        description: '',
        task_id: null,
        billable: false,
        client_name: '',
        rate_override: null,
      })
    }
  }

  // Update default date when component mounts (in case date changed)
  useEffect(() => {
    setValue('entry_date', getTodayString())
  }, [setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Date selector */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Date
        </label>
        <Controller
          name="entry_date"
          control={control}
          render={({ field }) => (
            <input
              type="date"
              {...field}
              max={getTodayString()}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-2.5 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none focus-glow transition-all-fast"
            />
          )}
        />
      </div>

      {/* Hours stepper */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Hours
        </label>
        <Controller
          name="hours"
          control={control}
          render={({ field }) => (
            <HoursStepper value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Category pills */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Category
        </label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <CategoryPills
              options={TIME_CATEGORIES}
              value={field.value}
              onChange={field.onChange}
              columns={2}
            />
          )}
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Description
        </label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <input
              type="text"
              {...field}
              placeholder="What did you work on?"
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-2.5 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none focus-glow transition-all-fast"
            />
          )}
        />
      </div>

      {/* Task link (optional) */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Link to Task (optional)
        </label>
        <Controller
          name="task_id"
          control={control}
          render={({ field }) => (
            <select
              value={field.value || ''}
              onChange={(e) => field.onChange(e.target.value || null)}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-2.5 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none focus-glow transition-all-fast"
            >
              <option value="">None</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          )}
        />
      </div>

      {/* Billable toggle */}
      <div>
        <Controller
          name="billable"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`relative h-6 w-11 rounded-full transition-all-fast ${
                  field.value ? 'bg-theme-accent-primary' : 'bg-theme-bg-tertiary border border-theme-border-primary'
                }`}
                onClick={() => field.onChange(!field.value)}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    field.value ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-theme-text-secondary">Billable</span>
            </label>
          )}
        />
      </div>

      {/* Billable fields (shown when toggle is on) */}
      {billable && (
        <div className="flex flex-col gap-3 rounded-lg border border-theme-border-primary bg-theme-bg-tertiary/50 p-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Client Name
            </label>
            <Controller
              name="client_name"
              control={control}
              render={({ field }) => (
                <>
                  <input
                    type="text"
                    {...field}
                    list="client-names"
                    placeholder="Client name"
                    className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none focus-glow transition-all-fast"
                  />
                  <datalist id="client-names">
                    {clientNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </>
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Rate Override ($/hr)
            </label>
            <Controller
              name="rate_override"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Default rate"
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none focus-glow transition-all-fast"
                />
              )}
            />
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-theme-accent-primary py-3 text-sm font-semibold text-white hover:opacity-90 shadow-md hover:shadow-glow-primary transition-all-fast btn-press disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Time Entry'}
      </button>

      {/* Switch to expense */}
      <button
        type="button"
        onClick={onSwitchToExpense}
        className="text-sm font-medium text-theme-accent-primary hover:text-theme-accent-secondary transition-all-fast"
      >
        + Expense
      </button>
    </form>
  )
}
