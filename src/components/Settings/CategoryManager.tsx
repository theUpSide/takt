import { useState } from 'react'
import { useCategoryStore } from '@/stores/categoryStore'
import type { Category } from '@/types'

export default function CategoryManager() {
  const { categories, createCategory, updateCategory, deleteCategory } = useCategoryStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#6B7280')

  const handleCreate = async () => {
    await createCategory({ name: 'New Category', color: '#6B7280' })
  }

  const handleStartEdit = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.name)
    setEditColor(category.color)
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    await updateCategory(editingId, { name: editName, color: editColor })
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this category? Items will become uncategorized.')) {
      await deleteCategory(id)
    }
  }

  const colors = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#10B981', // green
    '#F59E0B', // yellow
    '#EC4899', // pink
    '#EF4444', // red
    '#6366F1', // indigo
    '#14B8A6', // teal
    '#F97316', // orange
    '#6B7280', // gray
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Categories help organize your tasks and events into swim lanes.
        </p>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          Add Category
        </button>
      </div>

      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
          >
            {editingId === category.id ? (
              <>
                <div className="flex gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditColor(color)}
                      className={`h-6 w-6 rounded-full ${
                        editColor === color ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
                <button
                  onClick={handleSaveEdit}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-sm text-gray-500 hover:text-gray-600"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="flex-1 font-medium text-gray-900 dark:text-white">
                  {category.name}
                </span>
                <button
                  onClick={() => handleStartEdit(category)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ))}

        {categories.length === 0 && (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">
            No categories yet. Add one to get started.
          </p>
        )}
      </div>
    </div>
  )
}
