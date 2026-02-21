import { useState } from 'react'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import type { ChargeAccount, ChargeAccountFormData } from '@/types/timekeeping'

const emptyForm = (): ChargeAccountFormData => ({
  name: '',
  billable: false,
  client_name: '',
  hourly_rate: null,
  notes: '',
})

interface AccountFormProps {
  form: ChargeAccountFormData
  setForm: (form: ChargeAccountFormData) => void
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

function AccountForm({ form, setForm, saving, onSave, onCancel }: AccountFormProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-theme-accent-primary/50 bg-theme-bg-tertiary/60 p-4">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Account Name *
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Acme Corp, Internal R&D"
          autoFocus
          className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none transition-all-fast"
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className={`relative h-6 w-11 rounded-full transition-all-fast ${
            form.billable ? 'bg-theme-accent-primary' : 'bg-theme-bg-secondary border border-theme-border-primary'
          }`}
          onClick={() => setForm({ ...form, billable: !form.billable })}
        >
          <div
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              form.billable ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </div>
        <span className="text-sm font-medium text-theme-text-secondary">Billable</span>
      </label>

      {form.billable && (
        <div className="flex flex-col gap-3 pl-2 border-l-2 border-theme-accent-primary/30">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Client Name
            </label>
            <input
              type="text"
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              placeholder="Client or company name"
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none transition-all-fast"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Hourly Rate ($/hr)
            </label>
            <input
              type="number"
              value={form.hourly_rate ?? ''}
              onChange={(e) => setForm({ ...form, hourly_rate: e.target.value ? Number(e.target.value) : null })}
              placeholder="e.g. 175"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none transition-all-fast"
            />
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
          Notes (optional)
        </label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="e.g. retainer agreement, project scope"
          className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none transition-all-fast"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="rounded-lg bg-theme-accent-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all-fast btn-press disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-theme-border-primary px-4 py-2 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-tertiary transition-all-fast"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function ChargeAccountsManager() {
  const { chargeAccounts, createChargeAccount, updateChargeAccount, deleteChargeAccount } = useTimekeepingStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState<ChargeAccountFormData>(emptyForm())
  const [saving, setSaving] = useState(false)

  const handleStartEdit = (account: ChargeAccount) => {
    setShowNew(false)
    setEditingId(account.id)
    setForm({
      name: account.name,
      billable: account.billable,
      client_name: account.client_name ?? '',
      hourly_rate: account.hourly_rate,
      notes: account.notes ?? '',
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setShowNew(false)
    setForm(emptyForm())
  }

  const handleSaveEdit = async () => {
    if (!editingId || !form.name.trim()) return
    setSaving(true)
    const result = await updateChargeAccount(editingId, form)
    setSaving(false)
    if (result) {
      setEditingId(null)
      setForm(emptyForm())
    }
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const result = await createChargeAccount(form)
    setSaving(false)
    if (result) {
      setShowNew(false)
      setForm(emptyForm())
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete charge account "${name}"? This won't affect existing time entries.`)) {
      await deleteChargeAccount(id)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-theme-text-muted">
          Pre-configure billing info you can apply instantly when logging time.
        </p>
        {!showNew && (
          <button
            onClick={() => { setEditingId(null); setForm(emptyForm()); setShowNew(true) }}
            className="rounded-lg bg-theme-accent-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition-all-fast btn-press shrink-0 ml-3"
          >
            + New Account
          </button>
        )}
      </div>

      {showNew && (
        <AccountForm form={form} setForm={setForm} saving={saving} onSave={handleCreate} onCancel={handleCancelEdit} />
      )}

      <div className="flex flex-col gap-2">
        {chargeAccounts.map((account) => (
          <div
            key={account.id}
            className="rounded-lg border border-theme-border-primary bg-theme-bg-secondary"
          >
            {editingId === account.id ? (
              <div className="p-3">
                <AccountForm form={form} setForm={setForm} saving={saving} onSave={handleSaveEdit} onCancel={handleCancelEdit} />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3">
                {/* Billable indicator */}
                <div className={`h-2 w-2 rounded-full shrink-0 ${account.billable ? 'bg-green-400' : 'bg-theme-text-muted/40'}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-theme-text-primary">{account.name}</span>
                    {account.billable && (
                      <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
                        Billable
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {account.client_name && (
                      <span className="text-xs text-theme-text-muted">{account.client_name}</span>
                    )}
                    {account.hourly_rate != null && (
                      <span className="text-xs text-theme-text-muted">${account.hourly_rate}/hr</span>
                    )}
                    {account.notes && (
                      <span className="text-xs text-theme-text-muted italic truncate max-w-[160px]">{account.notes}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleStartEdit(account)}
                  className="text-xs text-theme-text-muted hover:text-theme-text-secondary transition-all-fast shrink-0"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(account.id, account.name)}
                  className="text-xs text-red-400 hover:text-red-300 transition-all-fast shrink-0"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {chargeAccounts.length === 0 && !showNew && (
          <div className="py-10 text-center">
            <p className="text-sm text-theme-text-muted">No charge accounts yet.</p>
            <p className="mt-1 text-xs text-theme-text-muted/70">Create one to quickly apply billing info when logging time.</p>
          </div>
        )}
      </div>
    </div>
  )
}
