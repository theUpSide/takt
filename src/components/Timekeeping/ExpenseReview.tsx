import { useState, useEffect, useCallback } from 'react'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import { useToastStore } from '@/stores/toastStore'
import { EXPENSE_CATEGORIES } from '@/types/timekeeping'
import type { Expense, ExpenseCategory } from '@/types/timekeeping'
import { formatDate, getTodayString } from '@/lib/dateUtils'
import { format, subMonths, startOfYear } from 'date-fns'
import clsx from 'clsx'

type DatePreset = 'month' | 'quarter' | 'ytd' | 'all' | 'custom'

interface ReceiptCache {
  [path: string]: string // path -> signed URL
}

export default function ExpenseReview() {
  const { expenses, getReceiptUrl, deleteExpense } = useTimekeepingStore()
  const toast = useToastStore()

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState(getTodayString())
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all')

  // Receipt state
  const [receiptUrls, setReceiptUrls] = useState<ReceiptCache>({})
  const [loadingReceipts, setLoadingReceipts] = useState(false)
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null)

  // Download state
  const [downloading, setDownloading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Apply date preset
  useEffect(() => {
    const today = getTodayString()
    setEndDate(today)

    switch (datePreset) {
      case 'month':
        setStartDate(format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
        break
      case 'quarter':
        setStartDate(format(subMonths(new Date(), 3), 'yyyy-MM-dd'))
        break
      case 'ytd':
        setStartDate(format(startOfYear(new Date()), 'yyyy-MM-dd'))
        break
      case 'all':
        setStartDate('')
        break
      case 'custom':
        // Keep current values
        break
    }
  }, [datePreset])

  // Filter expenses
  const filteredExpenses = expenses.filter((e) => {
    if (startDate && e.expense_date < startDate) return false
    if (endDate && e.expense_date > endDate) return false
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    return true
  }).sort((a, b) => b.expense_date.localeCompare(a.expense_date))

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const withReceipts = filteredExpenses.filter((e) => e.receipt_path)
  const withoutReceipts = filteredExpenses.filter((e) => !e.receipt_path)

  // Load receipt URLs for visible expenses
  const loadReceipts = useCallback(async () => {
    const expensesWithReceipts = filteredExpenses.filter(
      (e) => e.receipt_path && !receiptUrls[e.receipt_path]
    )
    if (expensesWithReceipts.length === 0) return

    setLoadingReceipts(true)
    const newUrls: ReceiptCache = { ...receiptUrls }

    await Promise.all(
      expensesWithReceipts.map(async (expense) => {
        if (!expense.receipt_path) return
        const url = await getReceiptUrl(expense.receipt_path)
        if (url) {
          newUrls[expense.receipt_path] = url
        }
      })
    )

    setReceiptUrls(newUrls)
    setLoadingReceipts(false)
  }, [filteredExpenses, receiptUrls, getReceiptUrl])

  useEffect(() => {
    loadReceipts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExpenses.length, categoryFilter, startDate, endDate])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    setDeletingId(id)
    await deleteExpense(id)
    setDeletingId(null)
  }

  // Generate downloadable HTML report with embedded receipt images
  const handleDownload = async () => {
    setDownloading(true)

    try {
      // Fetch all receipt images as base64 for embedding
      const receiptDataUrls: Record<string, string> = {}
      const expensesNeedingReceipts = filteredExpenses.filter((e) => e.receipt_path)

      await Promise.all(
        expensesNeedingReceipts.map(async (expense) => {
          if (!expense.receipt_path) return
          try {
            const url = receiptUrls[expense.receipt_path] || await getReceiptUrl(expense.receipt_path)
            if (!url) return

            const response = await fetch(url)
            const blob = await response.blob()
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
            receiptDataUrls[expense.id] = dataUrl
          } catch {
            // Skip failed receipt fetches
          }
        })
      )

      const html = buildExpenseReportHtml(filteredExpenses, receiptDataUrls, startDate, endDate, totalAmount)

      // Create and download HTML file
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateRange = startDate ? `${startDate}-to-${endDate}` : `all-through-${endDate}`
      a.download = `expense-report-${dateRange}.html`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Expense report downloaded')
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Filters bar */}
      <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-4 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
          {/* Date presets */}
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Date Range
            </label>
            <div className="flex flex-wrap gap-1.5">
              {([
                { id: 'month', label: 'Last Month' },
                { id: 'quarter', label: 'Last 3 Mo' },
                { id: 'ytd', label: 'YTD' },
                { id: 'all', label: 'All' },
                { id: 'custom', label: 'Custom' },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setDatePreset(id)}
                  className={clsx(
                    'rounded-md px-2.5 py-1.5 text-xs font-medium transition-all-fast btn-press',
                    datePreset === id
                      ? 'bg-theme-accent-primary text-white shadow-sm'
                      : 'bg-theme-bg-tertiary text-theme-text-secondary hover:text-theme-text-primary'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date inputs */}
          {datePreset === 'custom' && (
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-2.5 py-1.5 text-xs text-theme-text-primary focus:border-theme-accent-primary focus:outline-none transition-all-fast"
              />
              <span className="self-center text-xs text-theme-text-muted">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={getTodayString()}
                className="rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-2.5 py-1.5 text-xs text-theme-text-primary focus:border-theme-accent-primary focus:outline-none transition-all-fast"
              />
            </div>
          )}

          {/* Category filter */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
              className="rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-1.5 text-xs text-theme-text-primary focus:border-theme-accent-primary focus:outline-none transition-all-fast"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-3 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted">Total</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-theme-accent-primary">
            ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-3 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted">Expenses</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-theme-text-primary">{filteredExpenses.length}</div>
        </div>
        <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-3 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted">With Receipts</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-theme-accent-success">{withReceipts.length}</div>
        </div>
        <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-3 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted">Missing Receipts</div>
          <div className={clsx('mt-1 text-xl font-bold tabular-nums', withoutReceipts.length > 0 ? 'text-theme-accent-danger' : 'text-theme-text-primary')}>
            {withoutReceipts.length}
          </div>
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={downloading || filteredExpenses.length === 0}
        className="flex items-center justify-center gap-2 rounded-lg border border-theme-border-primary bg-theme-bg-card px-4 py-3 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast btn-press disabled:opacity-50"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {downloading ? 'Generating Report...' : `Download Expense Report (${filteredExpenses.length} expenses)`}
      </button>

      {/* Expense cards */}
      {filteredExpenses.length === 0 ? (
        <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-8 text-center shadow-lg">
          <svg className="mx-auto h-12 w-12 text-theme-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          <p className="mt-3 text-sm text-theme-text-muted">No expenses found for this period.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              receiptUrl={expense.receipt_path ? receiptUrls[expense.receipt_path] : undefined}
              loadingReceipt={loadingReceipts && !!expense.receipt_path && !receiptUrls[expense.receipt_path!]}
              onViewReceipt={() => expense.receipt_path && setExpandedReceipt(expense.receipt_path)}
              onDelete={() => handleDelete(expense.id)}
              deleting={deletingId === expense.id}
            />
          ))}
        </div>
      )}

      {/* Expanded receipt modal */}
      {expandedReceipt && receiptUrls[expandedReceipt] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setExpandedReceipt(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-xl bg-theme-bg-card shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpandedReceipt(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-all-fast"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={receiptUrls[expandedReceipt]}
              alt="Receipt"
              className="max-h-[85vh] max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface ExpenseCardProps {
  expense: Expense
  receiptUrl?: string
  loadingReceipt: boolean
  onViewReceipt: () => void
  onDelete: () => void
  deleting: boolean
}

function ExpenseCard({ expense, receiptUrl, loadingReceipt, onViewReceipt, onDelete, deleting }: ExpenseCardProps) {
  const getCategoryLabel = (cat: string) =>
    EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || cat

  return (
    <div
      className={clsx(
        'group rounded-xl border border-theme-border-primary bg-theme-bg-card shadow-lg overflow-hidden transition-all-fast hover:shadow-xl',
        deleting && 'opacity-50'
      )}
    >
      {/* Receipt image area */}
      {expense.receipt_path ? (
        <div
          className="relative h-40 cursor-pointer bg-theme-bg-tertiary"
          onClick={onViewReceipt}
        >
          {loadingReceipt ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-theme-accent-primary border-t-transparent" />
            </div>
          ) : receiptUrl ? (
            <>
              <img
                src={receiptUrl}
                alt="Receipt"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-theme-text-muted">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {/* Receipt badge */}
          <div className="absolute left-2 top-2 rounded-full bg-theme-accent-success/90 px-2 py-0.5 text-xs font-medium text-white">
            Receipt
          </div>
        </div>
      ) : (
        <div className="flex h-16 items-center justify-center bg-theme-bg-tertiary/50 border-b border-theme-border-primary">
          <span className="flex items-center gap-1.5 text-xs text-theme-text-muted">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            No receipt
          </span>
        </div>
      )}

      {/* Expense details */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tabular-nums text-theme-accent-primary">
                ${Number(expense.amount).toFixed(2)}
              </span>
              {expense.is_recurring && (
                <span className="rounded bg-theme-accent-warning/20 px-1.5 py-0.5 text-xs font-medium text-theme-accent-warning">
                  Recurring
                </span>
              )}
            </div>
            {expense.vendor && (
              <p className="truncate text-sm font-medium text-theme-text-primary">{expense.vendor}</p>
            )}
            {expense.description && (
              <p className="truncate text-xs text-theme-text-secondary mt-0.5">{expense.description}</p>
            )}
          </div>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex-shrink-0 rounded p-1 text-theme-text-muted opacity-0 group-hover:opacity-100 hover:bg-theme-accent-danger/20 hover:text-theme-accent-danger transition-all-fast"
            title="Delete"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="rounded bg-theme-bg-tertiary px-1.5 py-0.5 text-xs font-medium text-theme-text-secondary">
            {getCategoryLabel(expense.category)}
          </span>
          <span className="text-xs text-theme-text-muted">
            {formatDate(expense.expense_date, 'MMM d, yyyy')}
          </span>
        </div>
      </div>
    </div>
  )
}

function buildExpenseReportHtml(
  expenses: Expense[],
  receiptDataUrls: Record<string, string>,
  startDate: string,
  endDate: string,
  totalAmount: number
): string {
  const getCategoryLabel = (cat: string) =>
    EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || cat

  // Group expenses by category
  const byCategory: Record<string, Expense[]> = {}
  for (const exp of expenses) {
    const key = exp.category
    if (!byCategory[key]) byCategory[key] = []
    byCategory[key].push(exp)
  }

  const categoryTotals = Object.entries(byCategory).map(([cat, exps]) => ({
    category: getCategoryLabel(cat),
    count: exps.length,
    total: exps.reduce((s, e) => s + Number(e.amount), 0),
  })).sort((a, b) => b.total - a.total)

  const expenseRows = expenses.map((e) => {
    const hasReceipt = !!receiptDataUrls[e.id]
    return `
      <div class="expense-item" style="page-break-inside: avoid;">
        <div class="expense-header">
          <div class="expense-amount">$${Number(e.amount).toFixed(2)}</div>
          <div class="expense-meta">
            <span class="expense-date">${e.expense_date}</span>
            <span class="expense-category">${getCategoryLabel(e.category)}</span>
            ${e.is_recurring ? '<span class="recurring-badge">Recurring</span>' : ''}
          </div>
        </div>
        ${e.vendor ? `<div class="expense-vendor">${escapeHtml(e.vendor)}</div>` : ''}
        ${e.description ? `<div class="expense-description">${escapeHtml(e.description)}</div>` : ''}
        ${hasReceipt ? `
          <div class="receipt-container">
            <div class="receipt-label">Receipt:</div>
            <img src="${receiptDataUrls[e.id]}" class="receipt-image" alt="Receipt for ${escapeHtml(e.vendor || e.description || 'expense')}" />
          </div>
        ` : '<div class="no-receipt">No receipt attached</div>'}
      </div>`
  }).join('')

  const summaryRows = categoryTotals.map((c) => `
    <tr>
      <td>${c.category}</td>
      <td style="text-align: center;">${c.count}</td>
      <td style="text-align: right;">$${c.total.toFixed(2)}</td>
    </tr>
  `).join('')

  const dateRangeText = startDate
    ? `${startDate} to ${endDate}`
    : `Through ${endDate}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Expense Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
      color: #1a1a1a;
      background: #fff;
    }
    h1 { font-size: 22px; font-weight: 700; }
    .subtitle { color: #666; font-size: 13px; margin-top: 4px; }
    .report-header { margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 12px; }

    /* Summary */
    .summary-section { margin-bottom: 28px; }
    .summary-section h2 { font-size: 16px; font-weight: 600; margin-bottom: 10px; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .summary-card {
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .summary-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; }
    .summary-card .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .summary-card .value.amount { color: #0066cc; }

    .summary-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .summary-table th, .summary-table td { border: 1px solid #e5e5e5; padding: 6px 10px; }
    .summary-table th { background: #f8f8f8; font-weight: 600; text-align: left; }
    .summary-table tfoot td { font-weight: 700; background: #f8f8f8; }

    /* Expense items */
    .expenses-section h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    .expense-item {
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      background: #fafafa;
    }
    .expense-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .expense-amount { font-size: 20px; font-weight: 700; color: #0066cc; }
    .expense-meta { display: flex; gap: 8px; align-items: center; }
    .expense-date { font-size: 12px; color: #666; }
    .expense-category {
      font-size: 11px;
      background: #e8e8e8;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
    .recurring-badge {
      font-size: 10px;
      background: #fff3cd;
      color: #856404;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
    }
    .expense-vendor { font-size: 14px; font-weight: 500; margin-bottom: 2px; }
    .expense-description { font-size: 12px; color: #666; margin-bottom: 8px; }
    .receipt-container { margin-top: 10px; }
    .receipt-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 6px; }
    .receipt-image { max-width: 100%; max-height: 500px; border-radius: 6px; border: 1px solid #ddd; }
    .no-receipt { font-size: 12px; color: #999; font-style: italic; margin-top: 6px; }

    /* Footer */
    .report-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      font-size: 11px;
      color: #999;
    }

    @media print {
      body { padding: 12px; }
      .expense-item { break-inside: avoid; }
      .receipt-image { max-height: 400px; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>Expense Report</h1>
    <p class="subtitle">Period: ${escapeHtml(dateRangeText)}</p>
  </div>

  <div class="summary-section">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Total Expenses</div>
        <div class="value amount">$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="summary-card">
        <div class="label">Number of Expenses</div>
        <div class="value">${expenses.length}</div>
      </div>
      <div class="summary-card">
        <div class="label">With Receipts</div>
        <div class="value">${expenses.filter((e) => e.receipt_path).length} / ${expenses.length}</div>
      </div>
    </div>

    <table class="summary-table">
      <thead>
        <tr><th>Category</th><th style="text-align: center;">Count</th><th style="text-align: right;">Amount</th></tr>
      </thead>
      <tbody>${summaryRows}</tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td style="text-align: center;">${expenses.length}</td>
          <td style="text-align: right;">$${totalAmount.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="expenses-section">
    <h2>Expense Details</h2>
    ${expenseRows}
  </div>

  <div class="report-footer">
    Generated by Takt on ${new Date().toISOString().split('T')[0]}. All timestamps are contemporaneous records.
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
