import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useToastStore } from './toastStore'
import type { TimeEntry, Expense, TimeEntryFormData, ExpenseFormData } from '@/types/timekeeping'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'

interface TimekeepingState {
  timeEntries: TimeEntry[]
  expenses: Expense[]
  loading: boolean
  error: string | null

  // Time Entry CRUD
  fetchTimeEntries: (startDate?: string, endDate?: string) => Promise<void>
  createTimeEntry: (data: TimeEntryFormData) => Promise<TimeEntry | null>
  updateTimeEntry: (id: string, data: Partial<TimeEntry>) => Promise<TimeEntry | null>
  deleteTimeEntry: (id: string) => Promise<boolean>

  // Expense CRUD
  fetchExpenses: (startDate?: string, endDate?: string) => Promise<void>
  createExpense: (data: ExpenseFormData) => Promise<Expense | null>
  updateExpense: (id: string, data: Partial<Expense>) => Promise<Expense | null>
  deleteExpense: (id: string) => Promise<boolean>

  // Receipt
  uploadReceipt: (expenseId: string, file: File) => Promise<string | null>
  getReceiptUrl: (path: string) => Promise<string | null>

  // Dashboard selectors
  getWeekSummary: () => { totalHours: number; byCategory: Record<string, number>; totalExpenses: number }
  getMonthSummary: () => { totalHours: number; byCategory: Record<string, number>; totalExpenses: number }
  getRecentEntries: (limit?: number) => Array<{ type: 'time' | 'expense'; date: string; entry: TimeEntry | Expense }>
  getSweatEquityTotal: (rate: number) => number
  getDistinctVendors: () => string[]
  getDistinctClientNames: () => string[]

  // Subscriptions
  subscribeToChanges: () => () => void
}

export const useTimekeepingStore = create<TimekeepingState>((set, get) => ({
  timeEntries: [],
  expenses: [],
  loading: false,
  error: null,

  fetchTimeEntries: async (startDate?: string, endDate?: string) => {
    set({ loading: true, error: null })

    let query = supabase
      .from('time_entries')
      .select('*')
      .order('entry_date', { ascending: false })

    if (startDate) query = query.gte('entry_date', startDate)
    if (endDate) query = query.lte('entry_date', endDate)

    const { data, error } = await query

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ timeEntries: data ?? [], loading: false })
  },

  createTimeEntry: async (data: TimeEntryFormData) => {
    const toast = useToastStore.getState()

    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id
    if (!userId) {
      toast.error('Not authenticated')
      return null
    }

    const { data: newEntry, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: userId,
        entry_date: data.entry_date,
        hours: data.hours,
        category: data.category,
        description: data.description || null,
        task_id: data.task_id,
        billable: data.billable,
        client_name: data.billable ? (data.client_name || null) : null,
        rate_override: data.rate_override,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      toast.error('Failed to save time entry')
      return null
    }

    set({ timeEntries: [newEntry, ...get().timeEntries] })
    toast.success('Time entry saved')
    return newEntry
  },

  updateTimeEntry: async (id: string, data: Partial<TimeEntry>) => {
    const toast = useToastStore.getState()

    const { data: updated, error } = await supabase
      .from('time_entries')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      toast.error('Failed to update time entry')
      return null
    }

    set({
      timeEntries: get().timeEntries.map((e) => (e.id === id ? updated : e)),
    })
    toast.success('Time entry updated')
    return updated
  },

  deleteTimeEntry: async (id: string) => {
    const toast = useToastStore.getState()

    const { error } = await supabase.from('time_entries').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      toast.error('Failed to delete time entry')
      return false
    }

    set({ timeEntries: get().timeEntries.filter((e) => e.id !== id) })
    toast.success('Time entry deleted')
    return true
  },

  fetchExpenses: async (startDate?: string, endDate?: string) => {
    set({ loading: true, error: null })

    let query = supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })

    if (startDate) query = query.gte('expense_date', startDate)
    if (endDate) query = query.lte('expense_date', endDate)

    const { data, error } = await query

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ expenses: data ?? [], loading: false })
  },

  createExpense: async (data: ExpenseFormData) => {
    const toast = useToastStore.getState()

    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id
    if (!userId) {
      toast.error('Not authenticated')
      return null
    }

    const { data: newExpense, error } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        expense_date: data.expense_date,
        amount: data.amount,
        category: data.category,
        vendor: data.vendor || null,
        description: data.description || null,
        is_recurring: data.is_recurring,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      toast.error('Failed to save expense')
      return null
    }

    // Upload receipt if provided
    if (data.receipt_file && newExpense) {
      const receiptPath = await get().uploadReceipt(newExpense.id, data.receipt_file)
      if (receiptPath) {
        const { data: updated } = await supabase
          .from('expenses')
          .update({ receipt_path: receiptPath })
          .eq('id', newExpense.id)
          .select()
          .single()

        if (updated) {
          set({ expenses: [updated, ...get().expenses] })
          toast.success('Expense saved with receipt')
          return updated
        }
      }
    }

    set({ expenses: [newExpense, ...get().expenses] })
    toast.success('Expense saved')
    return newExpense
  },

  updateExpense: async (id: string, data: Partial<Expense>) => {
    const toast = useToastStore.getState()

    const { data: updated, error } = await supabase
      .from('expenses')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      toast.error('Failed to update expense')
      return null
    }

    set({
      expenses: get().expenses.map((e) => (e.id === id ? updated : e)),
    })
    toast.success('Expense updated')
    return updated
  },

  deleteExpense: async (id: string) => {
    const toast = useToastStore.getState()

    // Delete receipt from storage if exists
    const expense = get().expenses.find((e) => e.id === id)
    if (expense?.receipt_path) {
      await supabase.storage.from('receipts').remove([expense.receipt_path])
    }

    const { error } = await supabase.from('expenses').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      toast.error('Failed to delete expense')
      return false
    }

    set({ expenses: get().expenses.filter((e) => e.id !== id) })
    toast.success('Expense deleted')
    return true
  },

  uploadReceipt: async (expenseId: string, file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${expenseId}.${ext}`

    const { error } = await supabase.storage
      .from('receipts')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      useToastStore.getState().error('Failed to upload receipt')
      return null
    }

    return path
  },

  getReceiptUrl: async (path: string) => {
    const { data } = await supabase.storage
      .from('receipts')
      .createSignedUrl(path, 3600) // 1 hour expiry

    return data?.signedUrl ?? null
  },

  getWeekSummary: () => {
    const now = new Date()
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

    const entries = get().timeEntries.filter(
      (e) => e.entry_date >= weekStart && e.entry_date <= weekEnd
    )
    const weekExpenses = get().expenses.filter(
      (e) => e.expense_date >= weekStart && e.expense_date <= weekEnd
    )

    const byCategory: Record<string, number> = {}
    let totalHours = 0
    for (const entry of entries) {
      totalHours += Number(entry.hours)
      byCategory[entry.category] = (byCategory[entry.category] || 0) + Number(entry.hours)
    }

    const totalExpenses = weekExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

    return { totalHours, byCategory, totalExpenses }
  },

  getMonthSummary: () => {
    const now = new Date()
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

    const entries = get().timeEntries.filter(
      (e) => e.entry_date >= monthStart && e.entry_date <= monthEnd
    )
    const monthExpenses = get().expenses.filter(
      (e) => e.expense_date >= monthStart && e.expense_date <= monthEnd
    )

    const byCategory: Record<string, number> = {}
    let totalHours = 0
    for (const entry of entries) {
      totalHours += Number(entry.hours)
      byCategory[entry.category] = (byCategory[entry.category] || 0) + Number(entry.hours)
    }

    const totalExpenses = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

    return { totalHours, byCategory, totalExpenses }
  },

  getRecentEntries: (limit = 10) => {
    const timeItems = get().timeEntries.map((e) => ({
      type: 'time' as const,
      date: e.entry_date,
      entry: e,
    }))
    const expenseItems = get().expenses.map((e) => ({
      type: 'expense' as const,
      date: e.expense_date,
      entry: e,
    }))

    return [...timeItems, ...expenseItems]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit)
  },

  getSweatEquityTotal: (rate: number) => {
    const totalHours = get().timeEntries.reduce((sum, e) => sum + Number(e.hours), 0)
    return totalHours * rate
  },

  getDistinctVendors: () => {
    const vendors = get().expenses
      .map((e) => e.vendor)
      .filter((v): v is string => v !== null && v !== '')
    return [...new Set(vendors)].sort()
  },

  getDistinctClientNames: () => {
    const names = get().timeEntries
      .map((e) => e.client_name)
      .filter((n): n is string => n !== null && n !== '')
    return [...new Set(names)].sort()
  },

  subscribeToChanges: () => {
    const timeChannel = supabase
      .channel('time-entries-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_entries' },
        async (payload) => {
          const newId = (payload.new as TimeEntry)?.id
          const oldId = (payload.old as TimeEntry)?.id

          if (payload.eventType === 'INSERT' && newId) {
            const exists = get().timeEntries.some((e) => e.id === newId)
            if (!exists) {
              const { data } = await supabase
                .from('time_entries')
                .select('*')
                .eq('id', newId)
                .single()
              if (data) {
                set({ timeEntries: [data, ...get().timeEntries] })
              }
            }
          } else if (payload.eventType === 'UPDATE' && newId) {
            const { data } = await supabase
              .from('time_entries')
              .select('*')
              .eq('id', newId)
              .single()
            if (data) {
              set({ timeEntries: get().timeEntries.map((e) => (e.id === newId ? data : e)) })
            }
          } else if (payload.eventType === 'DELETE' && oldId) {
            set({ timeEntries: get().timeEntries.filter((e) => e.id !== oldId) })
          }
        }
      )
      .subscribe()

    const expenseChannel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        async (payload) => {
          const newId = (payload.new as Expense)?.id
          const oldId = (payload.old as Expense)?.id

          if (payload.eventType === 'INSERT' && newId) {
            const exists = get().expenses.some((e) => e.id === newId)
            if (!exists) {
              const { data } = await supabase
                .from('expenses')
                .select('*')
                .eq('id', newId)
                .single()
              if (data) {
                set({ expenses: [data, ...get().expenses] })
              }
            }
          } else if (payload.eventType === 'UPDATE' && newId) {
            const { data } = await supabase
              .from('expenses')
              .select('*')
              .eq('id', newId)
              .single()
            if (data) {
              set({ expenses: get().expenses.map((e) => (e.id === newId ? data : e)) })
            }
          } else if (payload.eventType === 'DELETE' && oldId) {
            set({ expenses: get().expenses.filter((e) => e.id !== oldId) })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(timeChannel)
      supabase.removeChannel(expenseChannel)
    }
  },
}))
