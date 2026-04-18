import { useState, useEffect } from 'react'
import Modal from '@/components/Common/Modal'
import { useEngagementStore } from '@/stores/engagementStore'
import { useClientStore } from '@/stores/clientStore'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import { ENGAGEMENT_TYPES, ENGAGEMENT_STATUSES } from '@/types/engagement'
import type { Engagement, EngagementFormData, EngagementType } from '@/types/engagement'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** If set, the form edits this engagement; otherwise creates a new one. */
  engagement?: Engagement | null
  /** Pre-selected client for new engagements. */
  defaultClientId?: string | null
  onSaved?: (id: string) => void
}

const empty = (clientId: string | null): EngagementFormData => ({
  client_id: clientId ?? '',
  title: '',
  engagement_type: 'hourly_1099',
  billing_rate: null,
  retainer_hours: null,
  fixed_price: null,
  start_date: null,
  end_date: null,
  status: 'active',
  scope_description: '',
  charge_account_id: null,
})

const fromEngagement = (e: Engagement): EngagementFormData => ({
  client_id: e.client_id,
  title: e.title,
  engagement_type: e.engagement_type,
  billing_rate: e.billing_rate,
  retainer_hours: e.retainer_hours,
  fixed_price: e.fixed_price,
  start_date: e.start_date,
  end_date: e.end_date,
  status: e.status,
  scope_description: e.scope_description ?? '',
  charge_account_id: e.charge_account_id,
})

export default function EngagementForm({
  isOpen,
  onClose,
  engagement,
  defaultClientId,
  onSaved,
}: Props) {
  const { createEngagement, updateEngagement } = useEngagementStore()
  const { clients } = useClientStore()
  const { chargeAccounts } = useTimekeepingStore()
  const [form, setForm] = useState<EngagementFormData>(empty(defaultClientId ?? null))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm(engagement ? fromEngagement(engagement) : empty(defaultClientId ?? null))
    }
  }, [isOpen, engagement, defaultClientId])

  const valid = form.title.trim() && form.client_id

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    // Clear type-irrelevant billing fields before save so stale values don't linger.
    const cleaned: EngagementFormData = {
      ...form,
      title: form.title.trim(),
      billing_rate: form.engagement_type === 'hourly_1099' ? form.billing_rate : null,
      retainer_hours: form.engagement_type === 'retainer' ? form.retainer_hours : null,
      fixed_price: form.engagement_type === 'fixed_price' ? form.fixed_price : null,
    }
    const result = engagement
      ? await updateEngagement(engagement.id, {
          client_id: cleaned.client_id,
          title: cleaned.title,
          engagement_type: cleaned.engagement_type,
          billing_rate: cleaned.billing_rate,
          retainer_hours: cleaned.retainer_hours,
          fixed_price: cleaned.fixed_price,
          start_date: cleaned.start_date,
          end_date: cleaned.end_date,
          status: cleaned.status,
          scope_description: cleaned.scope_description || null,
          charge_account_id: cleaned.charge_account_id,
        })
      : await createEngagement(cleaned)
    setSaving(false)
    if (result) {
      onSaved?.(result.id)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={engagement ? 'Edit Engagement' : 'New Engagement'}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Client *
            </label>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              disabled={!!engagement}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none disabled:opacity-60"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as EngagementFormData['status'] })
              }
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
            >
              {ENGAGEMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. DLA Pursuit, LogCap Teaming, Ongoing BD Retainer"
            autoFocus
            className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
            Engagement Type
          </label>
          <div className="flex flex-wrap gap-2">
            {ENGAGEMENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, engagement_type: t.value as EngagementType })}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all-fast btn-press ${
                  form.engagement_type === t.value
                    ? 'bg-theme-accent-primary text-white'
                    : 'bg-theme-bg-secondary text-theme-text-secondary border border-theme-border-primary hover:bg-theme-bg-hover'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type-specific billing fields */}
        {form.engagement_type === 'hourly_1099' && (
          <div className="pl-3 border-l-2 border-theme-accent-primary/30">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Hourly Rate ($/hr)
            </label>
            <input
              type="number"
              value={form.billing_rate ?? ''}
              onChange={(e) =>
                setForm({ ...form, billing_rate: e.target.value ? Number(e.target.value) : null })
              }
              step="0.01"
              min="0"
              placeholder="e.g. 175"
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
        )}

        {form.engagement_type === 'retainer' && (
          <div className="pl-3 border-l-2 border-theme-accent-primary/30 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
                  Hourly Rate ($/hr)
                </label>
                <input
                  type="number"
                  value={form.billing_rate ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, billing_rate: e.target.value ? Number(e.target.value) : null })
                  }
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
                  Expected Hours / Month
                </label>
                <input
                  type="number"
                  value={form.retainer_hours ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, retainer_hours: e.target.value ? Number(e.target.value) : null })
                  }
                  step="0.5"
                  min="0"
                  placeholder="e.g. 5"
                  className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {form.engagement_type === 'fixed_price' && (
          <div className="pl-3 border-l-2 border-theme-accent-primary/30">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Fixed Price ($)
            </label>
            <input
              type="number"
              value={form.fixed_price ?? ''}
              onChange={(e) =>
                setForm({ ...form, fixed_price: e.target.value ? Number(e.target.value) : null })
              }
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Start Date
            </label>
            <input
              type="date"
              value={form.start_date ?? ''}
              onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              End Date <span className="text-theme-text-muted/70">(blank = ongoing)</span>
            </label>
            <input
              type="date"
              value={form.end_date ?? ''}
              onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
            Linked Charge Account <span className="text-theme-text-muted/70">(optional)</span>
          </label>
          <select
            value={form.charge_account_id ?? ''}
            onChange={(e) =>
              setForm({ ...form, charge_account_id: e.target.value || null })
            }
            className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
          >
            <option value="">None</option>
            {chargeAccounts.map((ca) => (
              <option key={ca.id} value={ca.id}>
                {ca.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
            Scope Description
          </label>
          <textarea
            value={form.scope_description}
            onChange={(e) => setForm({ ...form, scope_description: e.target.value })}
            rows={3}
            placeholder="One-liner describing the scope of work..."
            className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !valid}
            className="rounded-lg bg-theme-accent-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all-fast btn-press disabled:opacity-50"
          >
            {saving ? 'Saving...' : engagement ? 'Save Changes' : 'Create Engagement'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-theme-border-primary px-4 py-2 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-tertiary transition-all-fast"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
