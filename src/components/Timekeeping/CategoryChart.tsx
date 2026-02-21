import { TIME_CATEGORIES } from '@/types/timekeeping'

const CATEGORY_COLORS: Record<string, string> = {
  product_dev: '#6366f1',
  bd_outreach: '#f59e0b',
  client_work: '#10b981',
  content: '#ec4899',
  admin: '#8b5cf6',
  professional_dev: '#06b6d4',
}

interface CategoryChartProps {
  byCategory: Record<string, number>
  totalHours: number
}

export default function CategoryChart({ byCategory, totalHours }: CategoryChartProps) {
  if (totalHours === 0) {
    return (
      <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-4 shadow-lg">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-theme-text-muted">
          Time Allocation
        </h3>
        <p className="text-sm text-theme-text-muted">No data to display</p>
      </div>
    )
  }

  // Build SVG donut chart segments
  const size = 160
  const strokeWidth = 28
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let cumulativeOffset = 0

  const segments = TIME_CATEGORIES
    .filter(({ value }) => (byCategory[value] || 0) > 0)
    .map(({ value, label }) => {
      const hours = byCategory[value] || 0
      const pct = hours / totalHours
      const dashLength = pct * circumference
      const dashOffset = -cumulativeOffset
      cumulativeOffset += dashLength
      return { value, label, hours, pct, dashLength, dashOffset }
    })

  return (
    <div className="rounded-xl border border-theme-border-primary bg-theme-bg-card p-4 shadow-lg">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-theme-text-muted">
        Time Allocation
      </h3>

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        {/* Donut chart */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="rotate-[-90deg]">
            {segments.map((seg) => (
              <circle
                key={seg.value}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={CATEGORY_COLORS[seg.value]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                strokeDashoffset={seg.dashOffset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-theme-text-primary">{totalHours.toFixed(0)}</span>
            <span className="text-xs text-theme-text-muted">hours</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2">
          {segments.map((seg) => (
            <div key={seg.value} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[seg.value] }}
              />
              <span className="text-sm text-theme-text-secondary">
                {seg.label}
              </span>
              <span className="text-sm font-medium tabular-nums text-theme-text-primary">
                {seg.hours.toFixed(1)}h
              </span>
              <span className="text-xs text-theme-text-muted">
                ({(seg.pct * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
