import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Item, ItemFilters, Dependency } from '@/types'
import { isOverdue, parseISO } from '@/lib/dateUtils'
import { useToastStore } from './toastStore'

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

  // Daily Planner selectors
  getItemsForDate: (date: string) => Item[]
  getUnscheduledTasks: () => Item[]
  scheduleItem: (id: string, date: string, startTime: string, durationMinutes?: number) => Promise<Item | null>
  unscheduleItem: (id: string) => Promise<Item | null>

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
    const toast = useToastStore.getState()
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
        // Daily planner scheduling fields
        scheduled_date: data.scheduled_date,
        scheduled_start: data.scheduled_start,
        duration_minutes: data.duration_minutes ?? 30,
      })
      .select('*, category:categories(*)')
      .single()

    if (error) {
      set({ error: error.message })
      toast.error(`Failed to create ${data.type ?? 'task'}`)
      return null
    }

    set({ items: [newItem, ...get().items] })
    toast.success(`${data.type === 'event' ? 'Event' : 'Task'} created`)
    return newItem
  },

  updateItem: async (id, data) => {
    const toast = useToastStore.getState()
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
      toast.error('Failed to update item')
      return null
    }

    set({
      items: get().items.map((item) => (item.id === id ? updated : item)),
    })
    return updated
  },

  deleteItem: async (id) => {
    const toast = useToastStore.getState()
    const item = get().items.find((i) => i.id === id)
    const { error } = await supabase.from('items').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      toast.error('Failed to delete item')
      return false
    }

    set({
      items: get().items.filter((item) => item.id !== id),
      dependencies: get().dependencies.filter(
        (d) => d.predecessor_id !== id && d.successor_id !== id
      ),
    })
    toast.success(`${item?.type === 'event' ? 'Event' : 'Task'} deleted`)
    return true
  },

  toggleComplete: async (id) => {
    const toast = useToastStore.getState()
    const item = get().items.find((i) => i.id === id)
    if (!item) return

    const completed = !item.completed
    const result = await get().updateItem(id, {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })

    if (result) {
      toast.success(completed ? 'Task completed!' : 'Task reopened')
    }
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

  // Daily Planner: Get all items for a specific date
  getItemsForDate: (date: string) => {
    const items = get().items
    return items.filter((item) => {
      // For events, check if start_time falls on this date
      if (item.type === 'event' && item.start_time) {
        return item.start_time.startsWith(date)
      }
      // For tasks, check scheduled_date
      if (item.type === 'task' && item.scheduled_date) {
        return item.scheduled_date === date
      }
      return false
    })
  },

  // Daily Planner: Get all unscheduled tasks
  getUnscheduledTasks: () => {
    const items = get().items
    return items.filter((item) => {
      return item.type === 'task' && !item.completed && !item.scheduled_date
    })
  },

  // Daily Planner: Schedule an item to a specific date and time
  scheduleItem: async (id: string, date: string, startTime: string, durationMinutes?: number) => {
    const toast = useToastStore.getState()
    const item = get().items.find((i) => i.id === id)
    if (!item) return null

    const result = await get().updateItem(id, {
      scheduled_date: date,
      scheduled_start: startTime,
      duration_minutes: durationMinutes ?? item.duration_minutes ?? 30,
    })

    if (result) {
      toast.success('Task scheduled')
    }
    return result
  },

  // Daily Planner: Remove scheduling from an item
  unscheduleItem: async (id: string) => {
    const toast = useToastStore.getState()
    const result = await get().updateItem(id, {
      scheduled_date: null,
      scheduled_start: null,
    })

    if (result) {
      toast.success('Task unscheduled')
    }
    return result
  },

  subscribeToChanges: () => {
    const itemsChannel = supabase
      .channel('items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, async (payload) => {
        const newItemId = (payload.new as Item)?.id
        const oldItemId = (payload.old as Item)?.id

        if (payload.eventType === 'INSERT' && newItemId) {
          // Check if item already exists (added by createItem)
          const currentItems = get().items
          if (currentItems.some((i) => i.id === newItemId)) {
            // Item already exists, just refresh it with full category data
            const { data } = await supabase
              .from('items')
              .select('*, category:categories(*)')
              .eq('id', newItemId)
              .single()

            if (data) {
              set({ items: get().items.map((i) => (i.id === data.id ? data : i)) })
            }
            return
          }

          // Fetch with category relation for new items from other sources
          const { data } = await supabase
            .from('items')
            .select('*, category:categories(*)')
            .eq('id', newItemId)
            .single()

          if (data) {
            set({ items: [data, ...get().items] })
          }
        } else if (payload.eventType === 'UPDATE' && newItemId) {
          const { data } = await supabase
            .from('items')
            .select('*, category:categories(*)')
            .eq('id', newItemId)
            .single()

          if (data) {
            set({ items: get().items.map((i) => (i.id === data.id ? data : i)) })
          }
        } else if (payload.eventType === 'DELETE' && oldItemId) {
          set({ items: get().items.filter((i) => i.id !== oldItemId) })
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
