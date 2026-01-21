import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Item, ItemFilters, Dependency } from '@/types'
import { isOverdue, parseISO } from '@/lib/dateUtils'

interface ItemState {
  items: Item[]
  dependencies: Dependency[]
  loading: boolean
  error: string | null

  // Actions
  fetchItems: () => Promise<void>
  fetchDependencies: () => Promise<void>
  createItem: (data: Partial<Item>) => Promise<Item | null>
  updateItem: (id: string, data: Partial<Item>) => Promise<Item | null>
  deleteItem: (id: string) => Promise<boolean>
  toggleComplete: (id: string) => Promise<void>

  // Dependencies
  addDependency: (predecessorId: string, successorId: string) => Promise<boolean>
  removeDependency: (predecessorId: string, successorId: string) => Promise<boolean>

  // Filters
  getFilteredItems: (filters: ItemFilters) => Item[]

  // Subscriptions
  subscribeToChanges: () => () => void
}

export const useItemStore = create<ItemState>((set, get) => ({
  items: [],
  dependencies: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('items')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ items: data ?? [], loading: false })
  },

  fetchDependencies: async () => {
    const { data, error } = await supabase.from('dependencies').select('*')

    if (error) {
      set({ error: error.message })
      return
    }

    set({ dependencies: data ?? [] })
  },

  createItem: async (data) => {
    const { data: newItem, error } = await supabase
      .from('items')
      .insert({
        type: data.type ?? 'task',
        title: data.title ?? '',
        description: data.description,
        category_id: data.category_id,
        start_time: data.start_time,
        end_time: data.end_time,
        due_date: data.due_date,
        source: data.source ?? 'manual',
      })
      .select('*, category:categories(*)')
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    set({ items: [newItem, ...get().items] })
    return newItem
  },

  updateItem: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('items')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, category:categories(*)')
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    set({
      items: get().items.map((item) => (item.id === id ? updated : item)),
    })
    return updated
  },

  deleteItem: async (id) => {
    const { error } = await supabase.from('items').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }

    set({
      items: get().items.filter((item) => item.id !== id),
      dependencies: get().dependencies.filter(
        (d) => d.predecessor_id !== id && d.successor_id !== id
      ),
    })
    return true
  },

  toggleComplete: async (id) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return

    const completed = !item.completed
    await get().updateItem(id, {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
  },

  addDependency: async (predecessorId, successorId) => {
    const { data, error } = await supabase
      .from('dependencies')
      .insert({
        predecessor_id: predecessorId,
        successor_id: successorId,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return false
    }

    set({ dependencies: [...get().dependencies, data] })
    return true
  },

  removeDependency: async (predecessorId, successorId) => {
    const { error } = await supabase
      .from('dependencies')
      .delete()
      .eq('predecessor_id', predecessorId)
      .eq('successor_id', successorId)

    if (error) {
      set({ error: error.message })
      return false
    }

    set({
      dependencies: get().dependencies.filter(
        (d) => !(d.predecessor_id === predecessorId && d.successor_id === successorId)
      ),
    })
    return true
  },

  getFilteredItems: (filters) => {
    let filtered = get().items

    // Search
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search)
      )
    }

    // Type filter
    if (filters.types.length > 0) {
      filtered = filtered.filter((item) => filters.types.includes(item.type))
    }

    // Category filter
    if (filters.category_ids.length > 0) {
      filtered = filtered.filter(
        (item) => item.category_id && filters.category_ids.includes(item.category_id)
      )
    }

    // Source filter
    if (filters.sources.length > 0) {
      filtered = filtered.filter((item) => filters.sources.includes(item.source))
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((item) => {
        if (filters.status === 'completed') return item.completed
        if (filters.status === 'pending') return !item.completed
        if (filters.status === 'overdue') {
          if (item.completed) return false
          const dueDate = item.due_date || item.start_time
          return dueDate && isOverdue(parseISO(dueDate))
        }
        return true
      })
    }

    // Date range filter
    if (filters.date_range.start || filters.date_range.end) {
      filtered = filtered.filter((item) => {
        const itemDate = item.due_date || item.start_time
        if (!itemDate) return false

        const date = parseISO(itemDate)
        if (filters.date_range.start && date < parseISO(filters.date_range.start)) {
          return false
        }
        if (filters.date_range.end && date > parseISO(filters.date_range.end)) {
          return false
        }
        return true
      })
    }

    return filtered
  },

  subscribeToChanges: () => {
    const itemsChannel = supabase
      .channel('items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, async (payload) => {
        const items = get().items

        if (payload.eventType === 'INSERT') {
          // Fetch with category relation
          const { data } = await supabase
            .from('items')
            .select('*, category:categories(*)')
            .eq('id', (payload.new as Item).id)
            .single()

          if (data) {
            set({ items: [data, ...items] })
          }
        } else if (payload.eventType === 'UPDATE') {
          const { data } = await supabase
            .from('items')
            .select('*, category:categories(*)')
            .eq('id', (payload.new as Item).id)
            .single()

          if (data) {
            set({
              items: items.map((i) => (i.id === data.id ? data : i)),
            })
          }
        } else if (payload.eventType === 'DELETE') {
          set({
            items: items.filter((i) => i.id !== (payload.old as Item).id),
          })
        }
      })
      .subscribe()

    const depsChannel = supabase
      .channel('dependencies-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dependencies' },
        (payload) => {
          const deps = get().dependencies

          if (payload.eventType === 'INSERT') {
            set({ dependencies: [...deps, payload.new as Dependency] })
          } else if (payload.eventType === 'DELETE') {
            set({
              dependencies: deps.filter((d) => d.id !== (payload.old as Dependency).id),
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(itemsChannel)
      supabase.removeChannel(depsChannel)
    }
  },
}))
