import { useState, useEffect } from 'react'
import Modal from '@/components/Common/Modal'
import { useClientStore } from '@/stores/clientStore'
import { RELATIONSHIP_STATUSES } from '@/types/engagement'
import type { Client, ClientFormData } from '@/types/engagement'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** If set, the form edits this client; otherwise creates a new one. */
  client?: Client | null
  /** Called with the saved client id on success. */
  onSaved?: (id: string) => void
}

const empty = (): ClientFormData => ({
  name: '',
  primary_contact_name: '',
  primary_contact_email: '',
  primary_contact_phone: '',
  cage_code: '',
  relationship_status: 'active',
  relationship_started: null,
  notes: '',
})

const fromClient = (c: Client): ClientFormData => ({
  name: c.name,
  primary_contact_name: c.primary_contact_name ?? '',
  primary_contact_email: c.primary_contact_email ?? '',
  primary_contact_phone: c.primary_contact_phone ?? '',
  cage_code: c.cage_code ?? '',
  relationship_status: c.relationship_status,
  relationship_started: c.relationship_started,
  notes: c.notes ?? '',
})

export default function ClientForm({ isOpen, onClose, client, onSaved }: Props) {
  const { createClient, updateClient } = useClientStore()
  const [form, setForm] = useState<ClientFormData>(empty())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm(client ? fromClient(client) : empty())
    }
  }, [isOpen, client])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const result = client
      ? await updateClient(client.id, {
          name: form.name.trim(),
          primary_contact_name: form.primary_contact_name || null,
          primary_contact_email: form.primary_contact_email || null,
          primary_contact_phone: form.primary_contact_phone || null,
          cage_code: form.cage_code || null,
          relationship_status: form.relationship_status,
          relationship_started: form.relationship_started,
          notes: form.notes || null,
        })
      : await createClient(form)
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
      title={client ? 'Edit Client' : 'New Client'}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
            Organization Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Hudson Edge, ATC"
            autoFocus
            className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none transition-all-fast"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Relationship Status
            </label>
            <select
              value={form.relationship_status}
              onChange={(e) =>
                setForm({ ...form, relationship_status: e.target.value as ClientFormData['relationship_status'] })
              }
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
            >
              {RELATIONSHIP_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Relationship Started
            </label>
            <input
              type="date"
              value={form.relationship_started ?? ''}
              onChange={(e) => setForm({ ...form, relationship_started: e.target.value || null })}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Primary Contact Name
            </label>
            <input
              type="text"
              value={form.primary_contact_name}
              onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              CAGE Code
            </label>
            <input
              type="text"
              value={form.cage_code}
              onChange={(e) => setForm({ ...form, cage_code: e.target.value })}
              placeholder="Optional"
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Email
            </label>
            <input
              type="email"
              value={form.primary_contact_email}
              onChange={(e) => setForm({ ...form, primary_contact_email: e.target.value })}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Phone
            </label>
            <input
              type="tel"
              value={form.primary_contact_phone}
              onChange={(e) => setForm({ ...form, primary_contact_phone: e.target.value })}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="rounded-lg bg-theme-accent-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all-fast btn-press disabled:opacity-50"
          >
            {saving ? 'Saving...' : client ? 'Save Changes' : 'Create Client'}
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
