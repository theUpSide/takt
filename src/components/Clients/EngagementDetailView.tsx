import { useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useClientStore } from '@/stores/clientStore'
import { useEngagementStore } from '@/stores/engagementStore'
import { useItemStore } from '@/stores/itemStore'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import {
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_TYPES,
} from '@/types/engagement'
import EngagementForm from './EngagementForm'
import DeliverablesList from './DeliverablesList'
import { ENGAGEMENT_STATUS_CLASSES } from './statusStyles'

export default function EngagementDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { engagements, deleteEngagement } = useEngagementStore()
  const { clients } = useClientStore()
  const { items } = useItemStore()
  const { timeEntries } = useTimekeepingStore()
  const [editing, setEditing] = useState(false)

  const engagement = useMemo(() => engagements.find((e) => e.id === id), [engagements, id])
  const client = useMemo(
    () => (engagement ? clients.find((c) => c.id === engagement.client_id) : null),
    [clients, engagement]
  )
  const relatedActions = useMemo(
    () => items.filter((i) => i.engagement_id === id && i.type === 'task'),
    [items, id]
  )
  const relatedTime = useMemo(
    () => timeEntries.filter((t) => t.engagement_id === id),
    [timeEntries, id]
  )

  const hoursTotal = useMemo(
    () => relatedTime.reduce((sum, t) => sum + Number(t.hours), 0),
    [relatedTime]
  )

  if (!engagement) {
    return (
      <div className="max-w-3xl mx-auto py-10 text-center">
        <p className="text-sm text-theme-text-muted">Engagement not found.</p>
        <Link
          to="/app/clients"
          className="mt-3 inline-block text-sm text-theme-accent-primary hover:underline"
        >
          Back to Clients
        </Link>
      </div>
    )
  }

  const handleDelete = async () => {
    if (
      confirm(
        `Delete engagement "${engagement.title}"? Linked time entries and actions will be unlinked but kept.`
      )
    ) {
      const ok = await deleteEngagement(engagement.id)
      if (ok) navigate(client ? `/app/clients/${client.id}` : '/app/clients')
    }
  }

  const typeLabel = ENGAGEMENT_TYPES.find((t) => t.value === engagement.engagement_type)?.label
  const statusLabel = ENGAGEMENT_STATUSES.find((s) => s.value === engagement.status)?.label
  const openActions = relatedActions.filter((a) => !a.completed)

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="text-sm">
        <Link to="/app/clients" className="text-theme-text-muted hover:text-theme-text-primary">
          Clients
        </Link>
        <span className="mx-1.5 text-theme-text-muted">/</span>
        {client ? (
          <Link
            to={`/app/clients/${client.id}`}
            className="text-theme-text-muted hover:text-theme-text-primary"
          >
            {client.name}
          </Link>
        ) : (
          <span className="text-theme-text-muted">Unknown client</span>
        )}
        <span className="mx-1.5 text-theme-text-muted">/</span>
        <span className="text-theme-text-primary">{engagement.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-theme-text-primary">{engagement.title}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                ENGAGEMENT_STATUS_CLASSES[engagement.status]
              }`}
            >
              {statusLabel}
            </span>
            <span className="rounded-full bg-theme-bg-tertiary px-2 py-0.5 text-xs font-medium text-theme-text-secondary">
              {typeLabel}
            </span>
          </div>
          {(engagement.start_date || engagement.end_date) && (
            <p className="mt-1 text-xs text-theme-text-muted">
              {engagement.start_date ?? '—'} → {engagement.end_date ?? 'ongoing'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-theme-border-primary px-3 py-1.5 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-theme-border-primary px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all-fast"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Hours logged" value={hoursTotal.toFixed(1)} />
        <StatCard label="Time entries" value={relatedTime.length} />
        <StatCard label="Open actions" value={openActions.length} />
        <StatCard
          label="Billing"
          value={billingValueLabel(engagement.engagement_type, engagement)}
          small
        />
      </div>

      {/* Scope */}
      {engagement.scope_description && (
        <div className="rounded-lg border border-theme-border-primary bg-theme-bg-secondary p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
            Scope
          </div>
          <p className="text-sm text-theme-text-primary whitespace-pre-wrap">
            {engagement.scope_description}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-theme-text-primary">
          Actions ({relatedActions.length})
        </h2>
        {relatedActions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-theme-border-primary py-6 text-center text-sm text-theme-text-muted">
            No actions linked to this engagement yet. Link a task by setting its engagement
            from the task modal.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {relatedActions.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-theme-border-primary bg-theme-bg-secondary p-2.5"
              >
                <div
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    a.completed ? 'bg-green-400' : 'bg-theme-accent-primary'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm ${
                      a.completed
                        ? 'text-theme-text-muted line-through'
                        : 'text-theme-text-primary'
                    }`}
                  >
                    {a.title}
                  </div>
                  {a.due_date && (
                    <div className="text-xs text-theme-text-muted">Due {a.due_date}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deliverables */}
      <DeliverablesList engagementId={engagement.id} />

      {/* Recent time entries */}
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-theme-text-primary">
          Recent Time Entries
        </h2>
        {relatedTime.length === 0 ? (
          <div className="rounded-lg border border-dashed border-theme-border-primary py-6 text-center text-sm text-theme-text-muted">
            No time logged against this engagement yet.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {relatedTime.slice(0, 10).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-theme-border-primary bg-theme-bg-secondary p-2.5 text-sm"
              >
                <span className="text-theme-text-muted w-24 shrink-0">{t.entry_date}</span>
                <span className="text-theme-text-primary font-medium w-16 shrink-0">
                  {Number(t.hours).toFixed(2)}h
                </span>
                <span className="text-theme-text-secondary truncate">
                  {t.description ?? <em className="text-theme-text-muted not-italic">no note</em>}
                </span>
              </div>
            ))}
            {relatedTime.length > 10 && (
              <div className="text-xs text-theme-text-muted text-center pt-1">
                +{relatedTime.length - 10} more
              </div>
            )}
          </div>
        )}
      </div>

      <EngagementForm
        isOpen={editing}
        onClose={() => setEditing(false)}
        engagement={engagement}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  small,
}: {
  label: string
  value: string | number
  small?: boolean
}) {
  return (
    <div className="rounded-lg border border-theme-border-primary bg-theme-bg-secondary p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
        {label}
      </div>
      <div
        className={`mt-1 font-semibold text-theme-text-primary ${
          small ? 'text-sm' : 'text-xl'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function billingValueLabel(
  type: string,
  e: { billing_rate: number | null; fixed_price: number | null; retainer_hours: number | null }
): string {
  if (type === 'hourly_1099' && e.billing_rate != null) return `$${e.billing_rate}/hr`
  if (type === 'retainer') {
    const parts: string[] = []
    if (e.billing_rate != null) parts.push(`$${e.billing_rate}/hr`)
    if (e.retainer_hours != null) parts.push(`${e.retainer_hours}h/mo`)
    return parts.join(' · ') || '—'
  }
  if (type === 'fixed_price' && e.fixed_price != null)
    return `$${e.fixed_price.toLocaleString()}`
  return '—'
}
