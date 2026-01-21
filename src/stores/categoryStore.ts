import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types'

interface CategoryState {
  categories: Category[]
  loading: boolean
  error: string | null

  // Actions
  fetchCategories: () => Promise<void>
  createCategory: (data: Partial<Category>) => Promise<Category | null>
  updateCategory: (id: string, data: Partial<Category>) => Promise<Category | null>
  deleteCategory: (id: string) => Promise<boolean>
  reorderCategories: (categories: Category[]) => Promise<void>
  subscribeToChanges: () => () => void
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ categories: data ?? [], loading: false })
  },

  createCategory: async (data) => {
    const categories = get().categories
    const maxOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) : 0

    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name: data.name ?? 'New Category',
        color: data.color ?? '#6B7280',
        sort_order: data.sort_order ?? maxOrder + 1,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    set({ categories: [...categories, newCategory] })
    return newCategory
  },

  updateCategory: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('categories')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    set({
      categories: get().categories.map((c) => (c.id === id ? updated : c)),
    })
    return updated
  },

  deleteCategory: async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }

    set({
      categories: get().categories.filter((c) => c.id !== id),
    })
    return true
  },

  reorderCategories: async (categories) => {
    // Optimistic update
    set({ categories })

    // Update each category's sort_order
    const updates = categories.map((cat, index) =>
      supabase.from('categories').update({ sort_order: index }).eq('id', cat.id)
    )

    await Promise.all(updates)
  },

  subscribeToChanges: () => {
    const channel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        (payload) => {
          const categories = get().categories

          if (payload.eventType === 'INSERT') {
            set({ categories: [...categories, payload.new as Category] })
          } else if (payload.eventType === 'UPDATE') {
            set({
              categories: categories.map((c) =>
                c.id === (payload.new as Category).id ? (payload.new as Category) : c
              ),
            })
          } else if (payload.eventType === 'DELETE') {
            set({
              categories: categories.filter((c) => c.id !== (payload.old as Category).id),
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
