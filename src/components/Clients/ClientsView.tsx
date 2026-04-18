import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/clientStore'
import { useEngagementStore } from '@/stores/engagementStore'
import { RELATIONSHIP_STATUSES } from '@/types/engagement'
import type { RelationshipStatus } from '@/types/engagement'
import ClientForm from './ClientForm'
import { RELATIONSHIP_STATUS_CLASSES } from './statusStyles'

type StatusFilter = RelationshipStatus | 'all'

export default function ClientsView() {
  const navigate = useNavigate()
  const { clients, loading } = useClientStore()
  const { engagements } = useEngagementStore()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showNew, setShowNew] = useState(false)

  const engagementCountByClient = useMemo(() => {
    const counts: Record<string, { total: number; active: number }> = {}
    for (const e of engagements) {
      const c = counts[e.client_id] ?? { total: 0, active: 0 }
      c.total += 1
      if (e.status === 'active') c.active += 1
      counts[e.client_id] = c
    }
    return counts
  }, [engagements])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return clients
    return clients.filter((c) => c.relationship_status === statusFilter)
  }, [clients, statusFilter])

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-theme-text-primary">Clients</h1>
          <p className="mt-0.5 text-sm text-theme-text-muted">
            Organizations you have a relationship with.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-lg bg-theme-accent-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition-all-fast btn-press"
        >
          + New Client
        </button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="All"
          count={clients.length}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        {RELATIONSHIP_STATUSES.map((s) => {
          const count = clients.filter((c) => c.relationship_status === s.value).length
          return (
            <FilterChip
              key={s.value}
              label={s.label}
              count={count}
              active={statusFilter === s.value}
              onClick={() => setStatusFilter(s.value)}
            />
          )
        })}
      </div>

      {/* Client list */}
      <div className="flex flex-col gap-2">
        {loading && clients.length === 0 && (
          <div className="py-10 text-center text-sm text-theme-text-muted">Loading...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-theme-text-muted">
              {clients.length === 0
                ? 'No clients yet.'
                : 'No clients match this filter.'}
            </p>
            {clients.length === 0 && (
              <p className="mt-1 text-xs text-theme-text-muted/70">
                Create one to start tracking engagements and actions.
              </p>
            )}
          </div>
        )}

        {filtered.map((client) => {
          const counts = engagementCountByClient[client.id] ?? { total: 0, active: 0 }
          return (
            <button
              key={client.id}
              onClick={() => navigate(`/app/clients/${client.id}`)}
              className="flex items-center gap-3 rounded-lg border border-theme-border-primary bg-theme-bg-secondary p-3 text-left hover:border-theme-accent-primary/50 hover:bg-theme-bg-hover transition-all-fast"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-theme-text-primary">{client.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      RELATIONSHIP_STATUS_CLASSES[client.relationship_status]
                    }`}
                  >
                    {RELATIONSHIP_STATUSES.find((s) => s.value === client.relationship_status)?.label}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {client.primary_contact_name && (
                    <span className="text-xs text-theme-text-muted">
                      {client.primary_contact_name}
                    </span>
                  )}
                  <span className="text-xs text-theme-text-muted">
                    {counts.total} engagement{counts.total === 1 ? '' : 's'}
                    {counts.active > 0 && ` (${counts.active} active)`}
                  </span>
                </div>
              </div>
              <svg
                className="h-4 w-4 text-theme-text-muted shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )
        })}
      </div>

      <ClientForm
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onSaved={(id) => navigate(`/app/clients/${id}`)}
      />
    </div>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-medium transition-all-fast btn-press ${
        active
          ? 'bg-theme-accent-primary text-white'
          : 'bg-theme-bg-secondary text-theme-text-secondary border border-theme-border-primary hover:bg-theme-bg-hover'
      }`}
    >
      {label}
      <span className="ml-1.5 text-xs opacity-70">{count}</span>
    </button>
  )
}
