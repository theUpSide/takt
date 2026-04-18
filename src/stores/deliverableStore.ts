import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useToastStore } from './toastStore'
import type { Deliverable, DeliverableFormData } from '@/types/deliverable'

interface DeliverableState {
  deliverables: Deliverable[]
  loading: boolean
  error: string | null

  fetchDeliverables: () => Promise<void>
  createDeliverable: (engagementId: string, data: DeliverableFormData) => Promise<Deliverable | null>
  updateDeliverable: (id: string, data: Partial<Deliverable>) => Promise<Deliverable | null>
  deleteDeliverable: (id: string) => Promise<boolean>
  getByEngagement: (engagementId: string) => Deliverable[]
  getFileUrl: (path: string) => Promise<string | null>
  subscribeToChanges: () => () => void
}

export const useDeliverableStore = create<DeliverableState>((set, get) => ({
  deliverables: [],
  loading: false,
  error: null,

  fetchDeliverables: async () => {
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('deliverables')
      .select('*')
      .order('delivered_on', { ascending: false, nullsFirst: false })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ deliverables: data ?? [], loading: false })
  },

  createDeliverable: async (engagementId, data) => {
    const toast = useToastStore.getState()

    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id
    if (!userId) {
      toast.error('Not authenticated')
      return null
    }

    // Upload file first if provided
    let filePath: string | null = null
    if (data.file) {
      const ext = data.file.name.split('.').pop()?.toLowerCase() || 'bin'
      const safeName = data.title.trim().replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60)
      filePath = `${engagementId}/${safeName}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('deliverables')
        .upload(filePath, data.file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        toast.error('Failed to upload file')
        return null
      }
    }

    const { data: newRow, error } = await supabase
      .from('deliverables')
      .insert({
        user_id: userId,
        engagement_id: engagementId,
        title: data.title.trim(),
        description: data.description || null,
        delivered_on: data.delivered_on || null,
        file_path: filePath,
        external_url: data.external_url || null,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      toast.error(`Failed to create deliverable: ${error.message}`)
      return null
    }

    set({ deliverables: [newRow, ...get().deliverables] })
    toast.success('Deliverable added')
    return newRow
  },

  updateDeliverable: async (id, data) => {
    const toast = useToastStore.getState()

    const { data: updated, error } = await supabase
      .from('deliverables')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      toast.error('Failed to update deliverable')
      return null
    }

    set({
      deliverables: get().deliverables.map((d) => (d.id === id ? updated : d)),
    })
    return updated
  },

  deleteDeliverable: async (id) => {
    const toast = useToastStore.getState()
    const existing = get().deliverables.find((d) => d.id === id)

    // Delete the file from storage if it exists
    if (existing?.file_path) {
      await supabase.storage.from('deliverables').remove([existing.file_path])
    }

    const { error } = await supabase.from('deliverables').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      toast.error('Failed to delete deliverable')
      return false
    }

    set({ deliverables: get().deliverables.filter((d) => d.id !== id) })
    toast.success('Deliverable deleted')
    return true
  },

  getByEngagement: (engagementId) =>
    get().deliverables.filter((d) => d.engagement_id === engagementId),

  getFileUrl: async (path) => {
    const { data } = await supabase.storage
      .from('deliverables')
      .createSignedUrl(path, 3600)
    return data?.signedUrl ?? null
  },

  subscribeToChanges: () => {
    const channel = supabase
      .channel('deliverables-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliverables' },
        (payload) => {
          const deliverables = get().deliverables

          if (payload.eventType === 'INSERT') {
            set({ deliverables: [payload.new as Deliverable, ...deliverables] })
          } else if (payload.eventType === 'UPDATE') {
            set({
              deliverables: deliverables.map((d) =>
                d.id === (payload.new as Deliverable).id ? (payload.new as Deliverable) : d
              ),
            })
          } else if (payload.eventType === 'DELETE') {
            set({
              deliverables: deliverables.filter(
                (d) => d.id !== (payload.old as Deliverable).id
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
