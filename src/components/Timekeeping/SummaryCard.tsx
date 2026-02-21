import { TIME_CATEGORIES } from '@/types/timekeeping'

// Colors for time categories
const CATEGORY_COLORS: Record<string, string> = {
  product_dev: '#6366f1',    // indigo
  bd_outreach: '#f59e0b',   // amber
  client_work: '#10b981',   // emerald
  content: '#ec4899',       // pink
  admin: '#8b5cf6',         // violet
  professional_dev: '#06b6d4', // cyan
}

interface SummaryCardProps {
  title: string
  totalHours: number
  byCategory: Record<string, number>
  totalExpenses: number
  warningThreshold?: number
}

export default function SummaryCard({
  title,
  totalHours,
  byCategory,
  totalExpenses,
  warningThreshold,
}: SummaryCardProps) {
  const showWarning = warningThreshold && totalHours > warningThreshold

  return (
    <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-4 shadow-lg transition-theme">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-theme-text-muted">
          {title}
        </h3>
        {showWarning && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
            {totalHours}h — check this
          </span>
        )}
      </div>

      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-theme-text-primary">
          {totalHours.toFixed(1)}
        </span>
        <span className="text-sm text-theme-text-muted">hours</span>
        {totalExpenses > 0 && (
          <>
            <span className="text-theme-text-muted">|</span>
            <span className="text-lg font-semibold tabular-nums text-theme-accent-success">
              ${totalExpenses.toFixed(2)}
            </span>
            <span className="text-sm text-theme-text-muted">spent</span>
          </>
        )}
      </div>

      {/* Stacked bar chart */}
      {totalHours > 0 && (
        <div className="mb-2">
          <div className="flex h-3 overflow-hidden rounded-full">
            {TIME_CATEGORIES.map(({ value }) => {
              const hours = byCategory[value] || 0
              if (hours === 0) return null
              const pct = (hours / totalHours) * 100
              return (
                <div
                  key={value}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: CATEGORY_COLORS[value],
                  }}
                  title={`${TIME_CATEGORIES.find((c) => c.value === value)?.label}: ${hours.toFixed(1)}h`}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {totalHours > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {TIME_CATEGORIES.map(({ value, label }) => {
            const hours = byCategory[value] || 0
            if (hours === 0) return null
            return (
              <div key={value} className="flex items-center gap-1.5 text-xs text-theme-text-muted">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[value] }}
                />
                <span>{label} {hours.toFixed(1)}h</span>
              </div>
            )
          })}
        </div>
      )}

      {totalHours === 0 && (
        <p className="text-sm text-theme-text-muted">No entries yet</p>
      )}
    </div>
  )
}
