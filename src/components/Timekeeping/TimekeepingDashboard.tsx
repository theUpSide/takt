import { useState } from 'react'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import SummaryCard from './SummaryCard'
import CategoryChart from './CategoryChart'
import RecentEntriesList from './RecentEntriesList'
import ExportDialog from './ExportDialog'

const DEFAULT_RATE = 150 // Default hourly rate for sweat equity calculation

export default function TimekeepingDashboard() {
  const { getWeekSummary, getMonthSummary, getSweatEquityTotal } = useTimekeepingStore()
  const [showExport, setShowExport] = useState(false)

  const weekSummary = getWeekSummary()
  const monthSummary = getMonthSummary()
  const sweatEquity = getSweatEquityTotal(DEFAULT_RATE)

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Week and Month summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          title="This Week"
          totalHours={weekSummary.totalHours}
          byCategory={weekSummary.byCategory}
          totalExpenses={weekSummary.totalExpenses}
          warningThreshold={60}
        />
        <SummaryCard
          title="This Month"
          totalHours={monthSummary.totalHours}
          byCategory={monthSummary.byCategory}
          totalExpenses={monthSummary.totalExpenses}
        />
      </div>

      {/* Category breakdown chart */}
      <CategoryChart
        byCategory={monthSummary.byCategory}
        totalHours={monthSummary.totalHours}
      />

      {/* Sweat equity card */}
      <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-4 shadow-lg">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-theme-text-muted">
          IP Investment
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-theme-accent-primary">
            ${sweatEquity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-sm text-theme-text-muted">
            at ${DEFAULT_RATE}/hr
          </span>
        </div>
      </div>

      {/* Recent entries */}
      <RecentEntriesList />

      {/* Export button */}
      <button
        onClick={() => setShowExport(true)}
        className="flex items-center justify-center gap-2 rounded-lg border border-theme-border-primary bg-theme-bg-card px-4 py-3 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast btn-press"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Data
      </button>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  )
}
