import { useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useClientStore } from '@/stores/clientStore'
import { useEngagementStore } from '@/stores/engagementStore'
import {
  RELATIONSHIP_STATUSES,
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_TYPES,
} from '@/types/engagement'
import ClientForm from './ClientForm'
import EngagementForm from './EngagementForm'
import {
  RELATIONSHIP_STATUS_CLASSES,
  ENGAGEMENT_STATUS_CLASSES,
} from './statusStyles'

export default function ClientDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { clients, deleteClient } = useClientStore()
  const { engagements } = useEngagementStore()

  const [editing, setEditing] = useState(false)
  const [creatingEngagement, setCreatingEngagement] = useState(false)

  const client = useMemo(() => clients.find((c) => c.id === id), [clients, id])
  const clientEngagements = useMemo(
    () => engagements.filter((e) => e.client_id === id),
    [engagements, id]
  )

  if (!client) {
    return (
      <div className="max-w-3xl mx-auto py-10 text-center">
        <p className="text-sm text-theme-text-muted">Client not found.</p>
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
        `Delete client "${client.name}"? This only works if the client has no engagements.`
      )
    ) {
      const ok = await deleteClient(client.id)
      if (ok) navigate('/app/clients')
    }
  }

  const statusLabel = RELATIONSHIP_STATUSES.find(
    (s) => s.value === client.relationship_status
  )?.label

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="text-sm">
        <Link to="/app/clients" className="text-theme-text-muted hover:text-theme-text-primary">
          Clients
        </Link>
        <span className="mx-1.5 text-theme-text-muted">/</span>
        <span className="text-theme-text-primary">{client.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-theme-text-primary">{client.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                RELATIONSHIP_STATUS_CLASSES[client.relationship_status]
              }`}
            >
              {statusLabel}
            </span>
          </div>
          {client.relationship_started && (
            <p className="mt-1 text-xs text-theme-text-muted">
              Relationship started {client.relationship_started}
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

      {/* Contact + CAGE info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InfoCard title="Primary Contact">
          {client.primary_contact_name || client.primary_contact_email || client.primary_contact_phone ? (
            <div className="flex flex-col gap-1 text-sm">
              {client.primary_contact_name && (
                <span className="text-theme-text-primary">{client.primary_contact_name}</span>
              )}
              {client.primary_contact_email && (
                <a
                  href={`mailto:${client.primary_contact_email}`}
                  className="text-theme-accent-primary hover:underline"
                >
                  {client.primary_contact_email}
                </a>
              )}
              {client.primary_contact_phone && (
                <span className="text-theme-text-secondary">{client.primary_contact_phone}</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-theme-text-muted italic">Not set</span>
          )}
        </InfoCard>

        <InfoCard title="CAGE Code">
          <span className="text-sm text-theme-text-primary font-mono">
            {client.cage_code ?? <em className="text-theme-text-muted not-italic">—</em>}
          </span>
        </InfoCard>
      </div>

      {client.notes && (
        <InfoCard title="Notes">
          <p className="text-sm text-theme-text-primary whitespace-pre-wrap">{client.notes}</p>
        </InfoCard>
      )}

      {/* Engagements */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-theme-text-primary">
            Engagements ({clientEngagements.length})
          </h2>
          <button
            onClick={() => setCreatingEngagement(true)}
            className="rounded-lg bg-theme-accent-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition-all-fast btn-press"
          >
            + New Engagement
          </button>
        </div>

        {clientEngagements.length === 0 ? (
          <div className="rounded-lg border border-dashed border-theme-border-primary py-8 text-center">
            <p className="text-sm text-theme-text-muted">No engagements yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clientEngagements.map((e) => {
              const typeLabel = ENGAGEMENT_TYPES.find((t) => t.value === e.engagement_type)?.label
              const statusLbl = ENGAGEMENT_STATUSES.find((s) => s.value === e.status)?.label
              return (
                <Link
                  key={e.id}
                  to={`/app/engagements/${e.id}`}
                  className="flex items-center gap-3 rounded-lg border border-theme-border-primary bg-theme-bg-secondary p-3 hover:border-theme-accent-primary/50 hover:bg-theme-bg-hover transition-all-fast"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-theme-text-primary">
                        {e.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          ENGAGEMENT_STATUS_CLASSES[e.status]
                        }`}
                      >
                        {statusLbl}
                      </span>
                      <span className="rounded-full bg-theme-bg-tertiary px-2 py-0.5 text-xs font-medium text-theme-text-secondary">
                        {typeLabel}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {e.billing_rate != null && (
                        <span className="text-xs text-theme-text-muted">${e.billing_rate}/hr</span>
                      )}
                      {e.fixed_price != null && (
                        <span className="text-xs text-theme-text-muted">
                          ${e.fixed_price.toLocaleString()} fixed
                        </span>
                      )}
                      {e.retainer_hours != null && (
                        <span className="text-xs text-theme-text-muted">
                          {e.retainer_hours}h/mo
                        </span>
                      )}
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
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <ClientForm
        isOpen={editing}
        onClose={() => setEditing(false)}
        client={client}
      />
      <EngagementForm
        isOpen={creatingEngagement}
        onClose={() => setCreatingEngagement(false)}
        defaultClientId={client.id}
        onSaved={(eid) => navigate(`/app/engagements/${eid}`)}
      />
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-theme-border-primary bg-theme-bg-secondary p-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
        {title}
      </div>
      <div>{children}</div>
    </div>
  )
}
