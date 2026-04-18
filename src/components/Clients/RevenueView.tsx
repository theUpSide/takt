import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isAfter,
  isSameDay,
  parseISO,
  format,
} from 'date-fns'
import { useEngagementStore } from '@/stores/engagementStore'
import { useClientStore } from '@/stores/clientStore'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { ENGAGEMENT_TYPES } from '@/types/engagement'
import type { Engagement } from '@/types/engagement'
import type { TimeEntry } from '@/types/timekeeping'

/**
 * Revenue view: month-to-date billable hours and dollars per engagement,
 * with a run-rate projection for the full month and a comparison against
 * the user's monthly revenue target.
 *
 * Rate resolution per entry: time_entry.rate_override (if set) beats
 * engagement.billing_rate. Entries outside the current month or against
 * non-billable engagement types (pursuit) are excluded from the totals.
 */
export default function RevenueView() {
  const { engagements } = useEngagementStore()
  const { clients } = useClientStore()
  const { timeEntries } = useTimekeepingStore()
  const { monthlyRevenueTarget, setMonthlyRevenueTarget } = useSettingsStore()

  const [editingTarget, setEditingTarget] = useState(false)
  const [targetDraft, setTargetDraft] = useState(
    monthlyRevenueTarget != null ? String(monthlyRevenueTarget) : ''
  )

  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  const businessDays = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }).filter((d) => !isWeekend(d)),
    [monthStart, monthEnd]
  )
  const businessDaysTotal = businessDays.length
  const businessDaysElapsed = businessDays.filter(
    (d) => !isAfter(d, today) || isSameDay(d, today)
  ).length

  const rows = useMemo(
    () => buildRevenueRows(engagements, timeEntries, monthStart, monthEnd, clients),
    [engagements, timeEntries, monthStart, monthEnd, clients]
  )

  const totals = useMemo(() => {
    const hours = rows.reduce((s, r) => s + r.hours, 0)
    const revenueMtd = rows.reduce((s, r) => s + r.revenueMtd, 0)
    const projected = rows.reduce((s, r) => s + r.projectedRevenue, 0)
    return { hours, revenueMtd, projected }
  }, [rows])

  const target = monthlyRevenueTarget
  const pctOfTarget = target && target > 0 ? (totals.revenueMtd / target) * 100 : null
  const pctOfTargetProjected =
    target && target > 0 ? (totals.projected / target) * 100 : null

  const saveTarget = () => {
    const n = targetDraft.trim() === '' ? null : Number(targetDraft)
    setMonthlyRevenueTarget(Number.isFinite(n as number) ? (n as number) : null)
    setEditingTarget(false)
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-theme-text-primary">Revenue</h1>
        <p className="mt-0.5 text-sm text-theme-text-muted">
          {format(monthStart, 'MMMM yyyy')} · {businessDaysElapsed} of{' '}
          {businessDaysTotal} business days elapsed
        </p>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label="Hours MTD" value={totals.hours.toFixed(1)} />
        <Stat label="Revenue MTD" value={formatDollars(totals.revenueMtd)} />
        <Stat label="Projected (run-rate)" value={formatDollars(totals.projected)} />
        <Stat
          label="Target"
          value={
            editingTarget ? (
              <span className="flex items-center gap-1">
                <span className="text-theme-text-muted text-sm">$</span>
                <input
                  type="number"
                  autoFocus
                  value={targetDraft}
                  onChange={(e) => setTargetDraft(e.target.value)}
                  onBlur={saveTarget}
                  onKeyDown={(e) => e.key === 'Enter' && saveTarget()}
                  className="w-28 rounded border border-theme-border-primary bg-theme-bg-tertiary px-2 py-0.5 text-lg font-semibold text-theme-text-primary focus:outline-none focus:border-theme-accent-primary"
                />
              </span>
            ) : (
              <button
                onClick={() => {
                  setTargetDraft(target != null ? String(target) : '')
                  setEditingTarget(true)
                }}
                className="hover:text-theme-accent-primary transition-all-fast"
              >
                {target != null ? formatDollars(target) : (
                  <span className="text-theme-text-muted text-base italic">Set target</span>
                )}
              </button>
            )
          }
        />
      </div>

      {/* Target progress bar */}
      {target != null && target > 0 && (
        <div className="rounded-lg border border-theme-border-primary bg-theme-bg-secondary p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Pace vs. Target
            </span>
            <span className="text-sm text-theme-text-primary">
              {pctOfTarget != null && `${pctOfTarget.toFixed(0)}% actual`}
              {pctOfTargetProjected != null && (
                <span className="ml-3 text-theme-text-muted">
                  {pctOfTargetProjected.toFixed(0)}% projected
                </span>
              )}
            </span>
          </div>
          <div className="h-3 rounded-full bg-theme-bg-tertiary overflow-hidden relative">
            {/* Projected bar (background) */}
            {pctOfTargetProjected != null && (
              <div
                className="absolute inset-y-0 left-0 bg-theme-accent-primary/30"
                style={{ width: `${Math.min(pctOfTargetProjected, 100)}%` }}
              />
            )}
            {/* Actual bar (foreground) */}
            {pctOfTarget != null && (
              <div
                className={`absolute inset-y-0 left-0 ${
                  pctOfTarget >= 100 ? 'bg-green-500' : 'bg-theme-accent-primary'
                }`}
                style={{ width: `${Math.min(pctOfTarget, 100)}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Per-engagement table */}
      <div className="rounded-lg border border-theme-border-primary bg-theme-bg-secondary overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-theme-text-muted border-b border-theme-border-primary">
          <div>Engagement</div>
          <div className="hidden md:block text-right">Rate</div>
          <div className="text-right">Hours</div>
          <div className="text-right">Revenue MTD</div>
          <div className="text-right">Projected</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-theme-text-muted">
            No billable hours logged this month yet.
          </div>
        ) : (
          <div className="divide-y divide-theme-border-primary">
            {rows.map((r) => (
              <Link
                key={r.engagement.id}
                to={`/app/engagements/${r.engagement.id}`}
                className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-3 text-sm hover:bg-theme-bg-hover transition-all-fast"
              >
                <div className="min-w-0">
                  <div className="text-theme-text-primary truncate">{r.engagement.title}</div>
                  <div className="text-xs text-theme-text-muted truncate">
                    {r.clientName ?? '—'} · {typeLabel(r.engagement)}
                  </div>
                </div>
                <div className="hidden md:block text-right text-theme-text-secondary">
                  {r.effectiveRate != null ? `$${r.effectiveRate}/hr` : '—'}
                </div>
                <div className="text-right text-theme-text-primary font-medium">
                  {r.hours.toFixed(1)}
                </div>
                <div className="text-right text-theme-text-primary font-medium">
                  {formatDollars(r.revenueMtd)}
                </div>
                <div className="text-right text-theme-text-muted">
                  {formatDollars(r.projectedRevenue)}
                </div>
              </Link>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-3 border-t border-theme-border-primary bg-theme-bg-tertiary text-sm font-semibold">
            <div className="text-theme-text-primary">Total</div>
            <div className="hidden md:block" />
            <div className="text-right text-theme-text-primary">
              {totals.hours.toFixed(1)}
            </div>
            <div className="text-right text-theme-text-primary">
              {formatDollars(totals.revenueMtd)}
            </div>
            <div className="text-right text-theme-text-primary">
              {formatDollars(totals.projected)}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-theme-text-muted">
        Projection = hours MTD ÷ business days elapsed × business days in month × rate. Pursuit-type
        engagements are excluded. Entries without a linked engagement aren't counted — link them
        from the Time tab to bring them in.
      </p>
    </div>
  )

  function buildRevenueRows(
    engagements: Engagement[],
    timeEntries: TimeEntry[],
    monthStart: Date,
    monthEnd: Date,
    clients: { id: string; name: string }[]
  ) {
    const byEngagement = new Map<string, { hours: number; revenue: number; rateWeights: number[]; rateValues: number[] }>()

    for (const t of timeEntries) {
      if (!t.engagement_id) continue
      const d = parseISO(t.entry_date)
      if (d < monthStart || d > monthEnd) continue

      const eng = engagements.find((e) => e.id === t.engagement_id)
      if (!eng || eng.engagement_type === 'pursuit') continue

      const hours = Number(t.hours)
      const rate = t.rate_override ?? eng.billing_rate ?? 0
      const revenue = hours * rate

      const agg = byEngagement.get(eng.id) ?? { hours: 0, revenue: 0, rateWeights: [], rateValues: [] }
      agg.hours += hours
      agg.revenue += revenue
      if (rate > 0) {
        agg.rateWeights.push(hours)
        agg.rateValues.push(rate)
      }
      byEngagement.set(eng.id, agg)
    }

    const clientNameById = new Map(clients.map((c) => [c.id, c.name]))

    return [...byEngagement.entries()]
      .map(([engagementId, agg]) => {
        const engagement = engagements.find((e) => e.id === engagementId)!
        // Effective rate = hours-weighted average of entry rates (or engagement rate)
        const effectiveRate =
          agg.rateWeights.length > 0
            ? agg.rateValues.reduce((s, r, i) => s + r * agg.rateWeights[i], 0) /
              agg.rateWeights.reduce((s, w) => s + w, 0)
            : engagement.billing_rate ?? null

        const projectedRevenue =
          businessDaysElapsed > 0
            ? (agg.revenue / businessDaysElapsed) * businessDaysTotal
            : agg.revenue

        return {
          engagement,
          clientName: clientNameById.get(engagement.client_id) ?? null,
          hours: agg.hours,
          revenueMtd: agg.revenue,
          projectedRevenue,
          effectiveRate: effectiveRate != null ? Math.round(effectiveRate) : null,
        }
      })
      .sort((a, b) => b.revenueMtd - a.revenueMtd)
  }
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-theme-border-primary bg-theme-bg-secondary p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-theme-text-primary">{value}</div>
    </div>
  )
}

function typeLabel(e: Engagement): string {
  return ENGAGEMENT_TYPES.find((t) => t.value === e.engagement_type)?.label ?? e.engagement_type
}

function formatDollars(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}
