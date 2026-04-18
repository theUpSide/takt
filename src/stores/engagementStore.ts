import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useToastStore } from './toastStore'
import type {
  Engagement,
  EngagementFormData,
  EngagementStatus,
} from '@/types/engagement'

interface EngagementState {
  engagements: Engagement[]
  loading: boolean
  error: string | null

  // CRUD
  fetchEngagements: () => Promise<void>
  createEngagement: (data: EngagementFormData) => Promise<Engagement | null>
  updateEngagement: (id: string, data: Partial<Engagement>) => Promise<Engagement | null>
  deleteEngagement: (id: string) => Promise<boolean>

  // Selectors
  getEngagementById: (id: string) => Engagement | undefined
  getEngagementsByClient: (clientId: string) => Engagement[]
  getEngagementsByStatus: (status: EngagementStatus) => Engagement[]
  getActiveEngagements: () => Engagement[]

  // Realtime
  subscribeToChanges: () => () => void
}

export const useEngagementStore = create<EngagementState>((set, get) => ({
  engagements: [],
  loading: false,
  error: null,

  fetchEngagements: async () => {
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('engagements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ engagements: data ?? [], loading: false })
  },

  createEngagement: async (data) => {
    const toast = useToastStore.getState()

    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id
    if (!userId) {
      toast.error('Not authenticated')
      return null
    }

    const { data: newEngagement, error } = await supabase
      .from('engagements')
      .insert({
        user_id: userId,
        client_id: data.client_id,
        title: data.title.trim(),
        engagement_type: data.engagement_type,
        billing_rate: data.billing_rate,
        retainer_hours: data.retainer_hours,
        fixed_price: data.fixed_price,
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status,
        scope_description: data.scope_description || null,
        charge_account_id: data.charge_account_id,
        // New pursuits default to the first pipeline stage so they show up
        // on the board immediately; non-pursuits leave this null.
        pursuit_stage: data.engagement_type === 'pursuit' ? 'initial_contact' : null,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      toast.error(`Failed to create engagement: ${error.message}`)
      return null
    }

    set({ engagements: [newEngagement, ...get().engagements] })
    toast.success('Engagement created')
    return newEngagement
  },

  updateEngagement: async (id, data) => {
    const toast = useToastStore.getState()

    const { data: updated, error } = await supabase
      .from('engagements')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      toast.error('Failed to update engagement')
      return null
    }

    set({
      engagements: get().engagements.map((e) => (e.id === id ? updated : e)),
    })
    return updated
  },

  deleteEngagement: async (id) => {
    const toast = useToastStore.getState()

    const { error } = await supabase.from('engagements').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      toast.error('Failed to delete engagement')
      return false
    }

    set({ engagements: get().engagements.filter((e) => e.id !== id) })
    toast.success('Engagement deleted')
    return true
  },

  getEngagementById: (id) => get().engagements.find((e) => e.id === id),

  getEngagementsByClient: (clientId) =>
    get().engagements.filter((e) => e.client_id === clientId),

  getEngagementsByStatus: (status) =>
    get().engagements.filter((e) => e.status === status),

  getActiveEngagements: () =>
    get().engagements.filter((e) => e.status === 'active'),

  subscribeToChanges: () => {
    const channel = supabase
      .channel('engagements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'engagements' },
        (payload) => {
          const engagements = get().engagements

          if (payload.eventType === 'INSERT') {
            set({ engagements: [payload.new as Engagement, ...engagements] })
          } else if (payload.eventType === 'UPDATE') {
            set({
              engagements: engagements.map((e) =>
                e.id === (payload.new as Engagement).id
                  ? (payload.new as Engagement)
                  : e
              ),
            })
          } else if (payload.eventType === 'DELETE') {
            set({
              engagements: engagements.filter(
                (e) => e.id !== (payload.old as Engagement).id
              ),
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
