import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCategoryStore } from '@/stores/categoryStore'
import type { CalendarSource } from '@/types'
import { formatDateTime } from '@/lib/dateUtils'

export default function CalendarSources() {
  const [sources, setSources] = useState<CalendarSource[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', ics_url: '', default_category_id: '' })
  const { categories } = useCategoryStore()

  useEffect(() => {
    fetchSources()
  }, [])

  const fetchSources = async () => {
    const { data } = await supabase
      .from('calendar_sources')
      .select('*')
      .order('created_at', { ascending: false })

    setSources(data || [])
    setLoading(false)
  }

  const handleCreate = () => {
    setEditingId('new')
    setFormData({ name: '', ics_url: '', default_category_id: '' })
  }

  const handleEdit = (source: CalendarSource) => {
    setEditingId(source.id)
    setFormData({
      name: source.name,
      ics_url: source.ics_url,
      default_category_id: source.default_category_id || '',
    })
  }

  const handleSave = async () => {
    if (!formData.name || !formData.ics_url) return

    if (editingId === 'new') {
      const { data } = await supabase
        .from('calendar_sources')
        .insert({
          name: formData.name,
          ics_url: formData.ics_url,
          default_category_id: formData.default_category_id || null,
        })
        .select()
        .single()

      if (data) {
        setSources([data, ...sources])
      }
    } else if (editingId) {
      const { data } = await supabase
        .from('calendar_sources')
        .update({
          name: formData.name,
          ics_url: formData.ics_url,
          default_category_id: formData.default_category_id || null,
        })
        .eq('id', editingId)
        .select()
        .single()

      if (data) {
        setSources(sources.map((s) => (s.id === editingId ? data : s)))
      }
    }

    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this calendar source? Synced events will also be deleted.')) {
      await supabase.from('calendar_sources').delete().eq('id', id)
      setSources(sources.filter((s) => s.id !== id))
    }
  }

  const handleToggleSync = async (source: CalendarSource) => {
    const { data } = await supabase
      .from('calendar_sources')
      .update({ sync_enabled: !source.sync_enabled })
      .eq('id', source.id)
      .select()
      .single()

    if (data) {
      setSources(sources.map((s) => (s.id === source.id ? data : s)))
    }
  }

  const handleManualSync = async () => {
    // This would call the Edge Function - for now just show feedback
    alert('Manual sync would be triggered here. Edge Function needs to be deployed.')
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add ICS calendar feeds to sync events automatically.
        </p>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          Add Calendar
        </button>
      </div>

      {editingId && (
        <div className="mb-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <input
            type="text"
            placeholder="Calendar name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <input
            type="url"
            placeholder="ICS URL (https://...)"
            value={formData.ics_url}
            onChange={(e) => setFormData({ ...formData, ics_url: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={formData.default_category_id}
            onChange={(e) => setFormData({ ...formData, default_category_id: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">No default category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="rounded bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="rounded bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sources.map((source) => (
          <div
            key={source.id}
            className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{source.name}</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-all">
                  {source.ics_url}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleSync(source)}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    source.sync_enabled
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {source.sync_enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              {source.last_synced_at && (
                <span>Last synced: {formatDateTime(source.last_synced_at)}</span>
              )}
              {source.last_error && (
                <span className="text-red-500">Error: {source.last_error}</span>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleManualSync()}
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                Sync Now
              </button>
              <button
                onClick={() => handleEdit(source)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(source.id)}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {sources.length === 0 && !editingId && (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">
            No calendar sources yet. Add one to sync external calendars.
          </p>
        )}
      </div>
    </div>
  )
}
