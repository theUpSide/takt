import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCategoryStore } from '@/stores/categoryStore'
import type { Person } from '@/types'

export default function PeopleManager() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    aliases: '',
    default_category_id: '',
  })
  const { categories } = useCategoryStore()

  useEffect(() => {
    fetchPeople()
  }, [])

  const fetchPeople = async () => {
    const { data } = await supabase
      .from('people')
      .select('*, default_category:categories(*)')
      .order('name', { ascending: true })

    setPeople(data || [])
    setLoading(false)
  }

  const handleCreate = () => {
    setEditingId('new')
    setFormData({ name: '', aliases: '', default_category_id: '' })
  }

  const handleEdit = (person: Person) => {
    setEditingId(person.id)
    setFormData({
      name: person.name,
      aliases: person.aliases.join(', '),
      default_category_id: person.default_category_id || '',
    })
  }

  const handleSave = async () => {
    if (!formData.name) return

    const aliases = formData.aliases
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)

    if (editingId === 'new') {
      const { data } = await supabase
        .from('people')
        .insert({
          name: formData.name,
          aliases,
          default_category_id: formData.default_category_id || null,
        })
        .select('*, default_category:categories(*)')
        .single()

      if (data) {
        setPeople([...people, data].sort((a, b) => a.name.localeCompare(b.name)))
      }
    } else if (editingId) {
      const { data } = await supabase
        .from('people')
        .update({
          name: formData.name,
          aliases,
          default_category_id: formData.default_category_id || null,
        })
        .eq('id', editingId)
        .select('*, default_category:categories(*)')
        .single()

      if (data) {
        setPeople(
          people
            .map((p) => (p.id === editingId ? data : p))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      }
    }

    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this person?')) {
      await supabase.from('people').delete().eq('id', id)
      setPeople(people.filter((p) => p.id !== id))
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          People help auto-categorize SMS tasks. When a person is mentioned, their default category
          is used.
        </p>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          Add Person
        </button>
      </div>

      {editingId && (
        <div className="mb-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <input
            type="text"
            placeholder="Aliases (comma-separated, e.g., Eli, E)"
            value={formData.aliases}
            onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
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

      <div className="space-y-2">
        {people.map((person) => (
          <div
            key={person.id}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
          >
            <div className="flex-1">
              <span className="font-medium text-gray-900 dark:text-white">{person.name}</span>
              {person.aliases.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({person.aliases.join(', ')})
                </span>
              )}
              {person.default_category && (
                <span
                  className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${person.default_category.color}20`,
                    color: person.default_category.color,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: person.default_category.color }}
                  />
                  {person.default_category.name}
                </span>
              )}
            </div>
            <button
              onClick={() => handleEdit(person)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(person.id)}
              className="text-sm text-red-500 hover:text-red-600"
            >
              Delete
            </button>
          </div>
        ))}

        {people.length === 0 && !editingId && (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">
            No people yet. Add people to auto-categorize SMS tasks.
          </p>
        )}
      </div>
    </div>
  )
}
