import { useState } from 'react'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import { formatDate } from '@/lib/dateUtils'
import { TIME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types/timekeeping'
import type { TimeEntry, Expense } from '@/types/timekeeping'
import clsx from 'clsx'

export default function RecentEntriesList() {
  const { getRecentEntries, deleteTimeEntry, deleteExpense } = useTimekeepingStore()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const entries = getRecentEntries(10)

  const handleDelete = async (type: 'time' | 'expense', id: string) => {
    if (!confirm('Delete this entry?')) return
    setDeletingId(id)
    if (type === 'time') {
      await deleteTimeEntry(id)
    } else {
      await deleteExpense(id)
    }
    setDeletingId(null)
  }

  const getCategoryLabel = (type: 'time' | 'expense', category: string) => {
    if (type === 'time') {
      return TIME_CATEGORIES.find((c) => c.value === category)?.label || category
    }
    return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-4 shadow-lg">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-theme-text-muted">
          Recent Entries
        </h3>
        <p className="text-sm text-theme-text-muted">No entries yet. Start logging!</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card shadow-lg">
      <div className="border-b border-theme-border-primary px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-theme-text-muted">
          Recent Entries
        </h3>
      </div>

      <div className="divide-y divide-theme-border-primary">
        {entries.map(({ type, entry }) => {
          const isTime = type === 'time'
          const timeEntry = entry as TimeEntry
          const expenseEntry = entry as Expense

          return (
            <div
              key={entry.id}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 transition-all-fast',
                deletingId === entry.id && 'opacity-50'
              )}
            >
              {/* Type icon */}
              <div
                className={clsx(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                  isTime
                    ? 'bg-theme-accent-primary/20 text-theme-accent-primary'
                    : 'bg-theme-accent-success/20 text-theme-accent-success'
                )}
              >
                {isTime ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-theme-text-muted">
                    {formatDate(isTime ? timeEntry.entry_date : expenseEntry.expense_date, 'MMM d')}
                  </span>
                  <span className="rounded bg-theme-bg-tertiary px-1.5 py-0.5 text-xs font-medium text-theme-text-secondary">
                    {getCategoryLabel(type, isTime ? timeEntry.category : expenseEntry.category)}
                  </span>
                  {isTime && timeEntry.billable && (
                    <span className="rounded bg-theme-accent-success/20 px-1.5 py-0.5 text-xs font-medium text-theme-accent-success">
                      Billable
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-theme-text-primary">
                  {isTime
                    ? timeEntry.description || 'No description'
                    : expenseEntry.description || expenseEntry.vendor || 'No description'}
                </p>
              </div>

              {/* Amount/Hours */}
              <div className="flex-shrink-0 text-right">
                {isTime ? (
                  <span className="text-sm font-semibold tabular-nums text-theme-text-primary">
                    {Number(timeEntry.hours).toFixed(1)}h
                  </span>
                ) : (
                  <span className="text-sm font-semibold tabular-nums text-theme-accent-success">
                    ${Number(expenseEntry.amount).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(type, entry.id)}
                disabled={deletingId === entry.id}
                className="flex-shrink-0 rounded p-1.5 text-theme-text-muted hover:bg-theme-accent-danger/20 hover:text-theme-accent-danger transition-all-fast"
                title="Delete"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
