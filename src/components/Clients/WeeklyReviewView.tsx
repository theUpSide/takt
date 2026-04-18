import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  format,
  parseISO,
} from 'date-fns'
import { useClientStore } from '@/stores/clientStore'
import { useEngagementStore } from '@/stores/engagementStore'
import { useItemStore } from '@/stores/itemStore'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import { RELATIONSHIP_STATUSES, ENGAGEMENT_TYPES } from '@/types/engagement'
import type { Client, Engagement } from '@/types/engagement'
import type { Item } from '@/types'
import type { TimeEntry } from '@/types/timekeeping'
import { RELATIONSHIP_STATUS_CLASSES } from './statusStyles'

const STALE_DAYS = 14

/**
 * Weekly review: one row per client with active or pursuit status.
 * Surfaces hours logged, next action, and days-since-last-activity
 * so relationships don't go cold without you noticing.
 */
export default function WeeklyReviewView() {
  const { clients } = useClientStore()
  const { engagements } = useEngagementStore()
  const { items } = useItemStore()
  const { timeEntries } = useTimekeepingStore()

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  const rows = useMemo(() => {
    const activeClients = clients
      .filter((c) => c.relationship_status === 'active' || c.relationship_status === 'pursuit')
      .sort((a, b) => a.name.localeCompare(b.name))

    return activeClients.map((client) => {
      const clientEngagements = engagements
        .filter((e) => e.client_id === client.id && (e.status === 'active' || e.status === 'paused'))
        .sort((a, b) => a.title.localeCompare(b.title))

      const engagementSummaries = clientEngagements.map((e) =>
        summarizeEngagement(e, items, timeEntries, weekStart, weekEnd, monthStart, monthEnd, today)
      )

      // Client-level stale check: most recent activity across all this client's
      // engagements (and all its time entries including legacy rows with just
      // client_name).
      const lastActivity = computeClientLastActivity(client, clientEngagements, items, timeEntries)
      const daysSince =
        lastActivity == null ? null : differenceInDays(today, lastActivity)

      return {
        client,
        engagementSummaries,
        daysSinceLastActivity: daysSince,
      }
    })
  }, [clients, engagements, items, timeEntries, weekStart, weekEnd, monthStart, monthEnd, today])

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-theme-text-primary">Weekly Review</h1>
        <p className="mt-0.5 text-sm text-theme-text-muted">
          Active and pursuit clients — hours logged, next actions, and days since last activity.
        </p>
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-theme-border-primary py-10 text-center">
          <p className="text-sm text-theme-text-muted">
            No active or pursuit clients. Mark a client as active to see them here.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rows.map(({ client, engagementSummaries, daysSinceLastActivity }) => {
          const stale =
            daysSinceLastActivity != null && daysSinceLastActivity > STALE_DAYS
          const statusLabel = RELATIONSHIP_STATUSES.find(
            (s) => s.value === client.relationship_status
          )?.label
          return (
            <div
              key={client.id}
              className="rounded-lg border border-theme-border-primary bg-theme-bg-secondary"
            >
              {/* Client header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-theme-border-primary">
                <Link
                  to={`/app/clients/${client.id}`}
                  className="font-medium text-theme-text-primary hover:text-theme-accent-primary"
                >
                  {client.name}
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    RELATIONSHIP_STATUS_CLASSES[client.relationship_status]
                  }`}
                >
                  {statusLabel}
                </span>
                <div className="flex-1" />
                <span
                  className={`text-xs font-medium ${
                    stale ? 'text-red-400' : 'text-theme-text-muted'
                  }`}
                >
                  {daysSinceLastActivity == null
                    ? 'No activity recorded'
                    : daysSinceLastActivity === 0
                    ? 'Active today'
                    : `${daysSinceLastActivity}d since last activity`}
                </span>
              </div>

              {/* Engagement rows */}
              {engagementSummaries.length === 0 ? (
                <div className="px-4 py-3 text-sm text-theme-text-muted italic">
                  No active engagements
                </div>
              ) : (
                <div className="divide-y divide-theme-border-primary">
                  {engagementSummaries.map((s) => (
                    <EngagementSummaryRow key={s.engagement.id} summary={s} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface EngagementSummary {
  engagement: Engagement
  hoursWeek: number
  hoursMonth: number
  nextAction: Item | null
  daysSinceActivity: number | null
}

function EngagementSummaryRow({ summary }: { summary: EngagementSummary }) {
  const { engagement, hoursWeek, hoursMonth, nextAction, daysSinceActivity } = summary
  const typeLabel = ENGAGEMENT_TYPES.find((t) => t.value === engagement.engagement_type)?.label
  const stale = daysSinceActivity != null && daysSinceActivity > STALE_DAYS

  return (
    <Link
      to={`/app/engagements/${engagement.id}`}
      className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-theme-bg-hover transition-all-fast"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-theme-text-primary truncate">{engagement.title}</span>
          <span className="text-xs text-theme-text-muted">{typeLabel}</span>
        </div>
        {nextAction ? (
          <div className="mt-0.5 text-xs text-theme-text-muted truncate">
            Next: {nextAction.title}
            {nextAction.due_date && (
              <span className="ml-1.5 text-theme-text-muted/70">
                · due {format(parseISO(nextAction.due_date), 'MMM d')}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-0.5 text-xs text-theme-text-muted italic">No open actions</div>
        )}
      </div>

      <div className="hidden sm:flex flex-col items-end text-xs text-theme-text-muted min-w-[96px]">
        <span>
          <span className="text-theme-text-primary font-medium">{hoursWeek.toFixed(1)}h</span> week
        </span>
        <span>
          <span className="text-theme-text-primary font-medium">{hoursMonth.toFixed(1)}h</span> month
        </span>
      </div>

      <div
        className={`text-xs font-medium min-w-[72px] text-right ${
          stale ? 'text-red-400' : 'text-theme-text-muted'
        }`}
      >
        {daysSinceActivity == null
          ? '—'
          : daysSinceActivity === 0
          ? 'today'
          : `${daysSinceActivity}d ago`}
      </div>
    </Link>
  )
}

function summarizeEngagement(
  engagement: Engagement,
  items: Item[],
  timeEntries: TimeEntry[],
  weekStart: Date,
  weekEnd: Date,
  monthStart: Date,
  monthEnd: Date,
  today: Date
): EngagementSummary {
  const entries = timeEntries.filter((t) => t.engagement_id === engagement.id)

  const hoursWeek = entries
    .filter((t) => inRange(parseISO(t.entry_date), weekStart, weekEnd))
    .reduce((s, t) => s + Number(t.hours), 0)

  const hoursMonth = entries
    .filter((t) => inRange(parseISO(t.entry_date), monthStart, monthEnd))
    .reduce((s, t) => s + Number(t.hours), 0)

  // Next action: earliest open task with a due date; fall back to any open task.
  const openTasks = items.filter(
    (i) => i.type === 'task' && i.engagement_id === engagement.id && !i.completed
  )
  const withDue = openTasks
    .filter((t) => t.due_date)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
  const nextAction = withDue[0] ?? openTasks[0] ?? null

  // Last activity: most recent of last time entry date, last task completion,
  // last task creation for this engagement.
  const candidates: Date[] = []
  if (entries.length > 0) {
    const latest = entries.reduce((acc, t) =>
      t.entry_date > acc.entry_date ? t : acc
    )
    candidates.push(parseISO(latest.entry_date))
  }
  const engagementTasks = items.filter((i) => i.engagement_id === engagement.id)
  for (const t of engagementTasks) {
    if (t.completed_at) candidates.push(parseISO(t.completed_at))
    if (t.updated_at) candidates.push(parseISO(t.updated_at))
  }
  const lastActivity = candidates.length ? new Date(Math.max(...candidates.map((d) => d.getTime()))) : null
  const daysSinceActivity = lastActivity ? differenceInDays(today, lastActivity) : null

  return { engagement, hoursWeek, hoursMonth, nextAction, daysSinceActivity }
}

function computeClientLastActivity(
  _client: Client,
  clientEngagements: Engagement[],
  items: Item[],
  timeEntries: TimeEntry[]
): Date | null {
  const engagementIds = new Set(clientEngagements.map((e) => e.id))

  const candidates: Date[] = []

  for (const t of timeEntries) {
    if (t.engagement_id && engagementIds.has(t.engagement_id)) {
      candidates.push(parseISO(t.entry_date))
    }
  }

  for (const i of items) {
    if (i.engagement_id && engagementIds.has(i.engagement_id)) {
      if (i.completed_at) candidates.push(parseISO(i.completed_at))
      if (i.updated_at) candidates.push(parseISO(i.updated_at))
    }
  }

  if (!candidates.length) return null
  return new Date(Math.max(...candidates.map((d) => d.getTime())))
}

function inRange(d: Date, start: Date, end: Date): boolean {
  return d >= start && d <= end
}
