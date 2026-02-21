import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import { useToastStore } from '@/stores/toastStore'
import { getTodayString } from '@/lib/dateUtils'
import { format, subMonths } from 'date-fns'
import type { TimeEntry, Expense } from '@/types/timekeeping'
import { TIME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types/timekeeping'

interface ExportDialogProps {
  onClose: () => void
}

export default function ExportDialog({ onClose }: ExportDialogProps) {
  const { timeEntries, expenses } = useTimekeepingStore()
  const toast = useToastStore()

  const [startDate, setStartDate] = useState(() =>
    format(subMonths(new Date(), 1), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState(getTodayString())
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv')
  const [includeExpenses, setIncludeExpenses] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Try server-side export via Edge Function, fall back to client-side
  const handleExport = async () => {
    setExporting(true)

    try {
      // Attempt server-side export
      const exported = await tryEdgeFunctionExport()
      if (exported) {
        onClose()
        return
      }

      // Fallback to client-side export
      clientSideExport()
      onClose()
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const tryEdgeFunctionExport = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return false

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) return false

      const response = await fetch(`${supabaseUrl}/functions/v1/export-timekeeping`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          format: exportFormat,
          include_expenses: includeExpenses,
        }),
      })

      if (!response.ok) return false

      if (exportFormat === 'csv') {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `takt-timekeeping-${startDate}-to-${endDate}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV exported (server)')
      } else {
        const html = await response.text()
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
          win.print()
        }
        toast.success('PDF opened for printing (server)')
      }
      return true
    } catch {
      // Edge Function unavailable, fall back silently
      return false
    }
  }

  const clientSideExport = () => {
    if (exportFormat === 'csv') {
      const csv = generateCSV()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `takt-timekeeping-${startDate}-to-${endDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported')
    } else {
      const filteredTime = timeEntries.filter(
        (e) => e.entry_date >= startDate && e.entry_date <= endDate
      )
      const filteredExpenses = includeExpenses
        ? expenses.filter((e) => e.expense_date >= startDate && e.expense_date <= endDate)
        : []

      const totalHours = filteredTime.reduce((s, e) => s + Number(e.hours), 0)
      const totalExpenseAmt = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0)

      const html = buildPdfHtml(filteredTime, filteredExpenses, startDate, endDate, totalHours, totalExpenseAmt)
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        win.print()
      }
      toast.success('PDF opened for printing')
    }
  }

  const generateCSV = () => {
    const filteredTime = timeEntries.filter(
      (e) => e.entry_date >= startDate && e.entry_date <= endDate
    )
    const filteredExpenses = includeExpenses
      ? expenses.filter((e) => e.expense_date >= startDate && e.expense_date <= endDate)
      : []

    const lines: string[] = []

    lines.push('TIME ENTRIES')
    lines.push('Date,Hours,Category,Description,Billable,Client,Rate Override,Logged At')
    for (const entry of filteredTime) {
      lines.push([
        entry.entry_date,
        entry.hours,
        TIME_CATEGORIES.find((c) => c.value === entry.category)?.label || entry.category,
        `"${(entry.description || '').replace(/"/g, '""')}"`,
        entry.billable ? 'Yes' : 'No',
        `"${(entry.client_name || '').replace(/"/g, '""')}"`,
        entry.rate_override ?? '',
        entry.created_at,
      ].join(','))
    }

    if (filteredExpenses.length > 0) {
      lines.push('')
      lines.push('EXPENSES')
      lines.push('Date,Amount,Category (Schedule C),Vendor,Description,Recurring,Logged At')
      for (const expense of filteredExpenses) {
        lines.push([
          expense.expense_date,
          expense.amount,
          EXPENSE_CATEGORIES.find((c) => c.value === expense.category)?.label || expense.category,
          `"${(expense.vendor || '').replace(/"/g, '""')}"`,
          `"${(expense.description || '').replace(/"/g, '""')}"`,
          expense.is_recurring ? 'Yes' : 'No',
          expense.created_at,
        ].join(','))
      }
    }

    lines.push('')
    lines.push('SUMMARY')
    lines.push(`Total Hours,${filteredTime.reduce((s, e) => s + Number(e.hours), 0)}`)
    if (filteredExpenses.length > 0) {
      lines.push(`Total Expenses,$${filteredExpenses.reduce((s, e) => s + Number(e.amount), 0).toFixed(2)}`)
    }

    return lines.join('\n')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-xl border border-theme-border-primary bg-theme-bg-card p-6 shadow-xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-theme-text-primary">Export Data</h2>

        <div className="flex flex-col gap-4">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
                From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none transition-all-fast"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
                To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={getTodayString()}
                className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none transition-all-fast"
              />
            </div>
          </div>

          {/* Format selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Format
            </label>
            <div className="flex gap-3">
              {(['csv', 'pdf'] as const).map((fmt) => (
                <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={fmt}
                    checked={exportFormat === fmt}
                    onChange={() => setExportFormat(fmt)}
                    className="accent-[var(--accent-primary)]"
                  />
                  <span className="text-sm font-medium text-theme-text-secondary uppercase">
                    {fmt}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Include expenses */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeExpenses}
              onChange={(e) => setIncludeExpenses(e.target.checked)}
              className="accent-[var(--accent-primary)] h-4 w-4"
            />
            <span className="text-sm font-medium text-theme-text-secondary">Include expenses</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-theme-border-primary py-2.5 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover transition-all-fast"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 rounded-lg bg-theme-accent-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 shadow-md transition-all-fast disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function buildPdfHtml(
  timeEntries: TimeEntry[],
  expenses: Expense[],
  startDate: string,
  endDate: string,
  totalHours: number,
  totalExpenses: number
): string {
  const timeRows = timeEntries
    .map(
      (e) => `<tr>
        <td>${e.entry_date}</td>
        <td>${e.hours}</td>
        <td>${TIME_CATEGORIES.find((c) => c.value === e.category)?.label || e.category}</td>
        <td>${e.description || ''}</td>
        <td>${e.billable ? 'Yes' : ''}</td>
        <td>${e.client_name || ''}</td>
      </tr>`
    )
    .join('')

  const expenseRows = expenses
    .map(
      (e) => `<tr>
        <td>${e.expense_date}</td>
        <td>$${Number(e.amount).toFixed(2)}</td>
        <td>${EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label || e.category}</td>
        <td>${e.vendor || ''}</td>
        <td>${e.description || ''}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <title>Takt Timekeeping Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin-top: 24px; border-bottom: 2px solid #333; padding-bottom: 4px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .summary { background: #f9f9f9; padding: 12px; border-radius: 4px; margin-top: 20px; }
    .summary strong { font-size: 16px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Indy-Pendent Solutions — Timekeeping Report</h1>
  <p class="subtitle">Period: ${startDate} to ${endDate}</p>

  <h2>Time Entries</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Hours</th><th>Category</th><th>Description</th><th>Billable</th><th>Client</th></tr>
    </thead>
    <tbody>${timeRows || '<tr><td colspan="6">No entries</td></tr>'}</tbody>
  </table>

  ${expenses.length > 0 ? `
  <h2>Expenses</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Amount</th><th>Category</th><th>Vendor</th><th>Description</th></tr>
    </thead>
    <tbody>${expenseRows}</tbody>
  </table>
  ` : ''}

  <div class="summary">
    <strong>Total Hours: ${totalHours.toFixed(1)}</strong><br/>
    ${expenses.length > 0 ? `<strong>Total Expenses: $${totalExpenses.toFixed(2)}</strong>` : ''}
  </div>

  <p style="margin-top: 24px; font-size: 11px; color: #999;">
    Generated by Takt on ${new Date().toISOString().split('T')[0]}. All timestamps are contemporaneous records.
  </p>
</body>
</html>`
}
