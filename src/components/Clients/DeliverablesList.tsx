import { useState, useRef } from 'react'
import { useDeliverableStore } from '@/stores/deliverableStore'
import { getTodayString } from '@/lib/dateUtils'
import type { Deliverable, DeliverableFormData } from '@/types/deliverable'

interface Props {
  engagementId: string
}

const emptyForm = (): DeliverableFormData => ({
  title: '',
  description: '',
  delivered_on: getTodayString(),
  external_url: '',
  file: null,
})

export default function DeliverablesList({ engagementId }: Props) {
  const { getByEngagement, createDeliverable, deleteDeliverable, getFileUrl } =
    useDeliverableStore()
  const deliverables = getByEngagement(engagementId)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<DeliverableFormData>(emptyForm())
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const result = await createDeliverable(engagementId, form)
    setSaving(false)
    if (result) {
      setForm(emptyForm())
      setShowForm(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (d: Deliverable) => {
    if (confirm(`Delete deliverable "${d.title}"?`)) {
      await deleteDeliverable(d.id)
    }
  }

  const handleDownload = async (d: Deliverable) => {
    if (!d.file_path) return
    const url = await getFileUrl(d.file_path)
    if (url) window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-theme-text-primary">
          Deliverables ({deliverables.length})
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-theme-accent-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition-all-fast btn-press"
          >
            + Add Deliverable
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="flex flex-col gap-3 rounded-lg border border-theme-accent-primary/50 bg-theme-bg-tertiary/60 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Gap Analysis Brief, Past-Performance Volume"
              autoFocus
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none transition-all-fast"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none transition-all-fast"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
                Delivered On
              </label>
              <input
                type="date"
                value={form.delivered_on ?? ''}
                onChange={(e) =>
                  setForm({ ...form, delivered_on: e.target.value || null })
                }
                className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
                External URL <span className="text-theme-text-muted/70">(or upload below)</span>
              </label>
              <input
                type="url"
                value={form.external_url}
                onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none transition-all-fast"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Attach File
            </label>
            <input
              type="file"
              ref={fileRef}
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
              className="block w-full text-sm text-theme-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-theme-bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-theme-text-primary hover:file:bg-theme-bg-hover"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="rounded-lg bg-theme-accent-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all-fast btn-press disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setForm(emptyForm())
              }}
              className="rounded-lg border border-theme-border-primary px-4 py-2 text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-tertiary transition-all-fast"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Deliverables list */}
      {deliverables.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-theme-border-primary py-6 text-center text-sm text-theme-text-muted">
          No deliverables yet. Add briefs, proposals, analysis docs as they ship.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {deliverables.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-lg border border-theme-border-primary bg-theme-bg-secondary p-2.5"
            >
              {/* File/link icon */}
              <div className="shrink-0 text-theme-text-muted">
                {d.file_path ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ) : d.external_url ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm text-theme-text-primary">{d.title}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {d.delivered_on && (
                    <span className="text-xs text-theme-text-muted">{d.delivered_on}</span>
                  )}
                  {d.description && (
                    <span className="text-xs text-theme-text-muted truncate max-w-[200px]">
                      {d.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {d.file_path && (
                <button
                  onClick={() => handleDownload(d)}
                  className="text-xs text-theme-accent-primary hover:underline shrink-0"
                >
                  Download
                </button>
              )}
              {d.external_url && (
                <a
                  href={d.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-theme-accent-primary hover:underline shrink-0"
                >
                  Open
                </a>
              )}
              <button
                onClick={() => handleDelete(d)}
                className="text-xs text-red-400 hover:text-red-300 transition-all-fast shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
