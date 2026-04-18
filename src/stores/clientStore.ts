import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useToastStore } from './toastStore'
import type { Client, ClientFormData, RelationshipStatus } from '@/types/engagement'

interface ClientState {
  clients: Client[]
  loading: boolean
  error: string | null

  // CRUD
  fetchClients: () => Promise<void>
  createClient: (data: ClientFormData) => Promise<Client | null>
  updateClient: (id: string, data: Partial<Client>) => Promise<Client | null>
  deleteClient: (id: string) => Promise<boolean>

  // Selectors
  getActiveClients: () => Client[]
  getClientById: (id: string) => Client | undefined
  getClientsByStatus: (status: RelationshipStatus) => Client[]

  // Realtime
  subscribeToChanges: () => () => void
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  loading: false,
  error: null,

  fetchClients: async () => {
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ clients: data ?? [], loading: false })
  },

  createClient: async (data) => {
    const toast = useToastStore.getState()

    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id
    if (!userId) {
      toast.error('Not authenticated')
      return null
    }

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        user_id: userId,
        name: data.name.trim(),
        primary_contact_name: data.primary_contact_name || null,
        primary_contact_email: data.primary_contact_email || null,
        primary_contact_phone: data.primary_contact_phone || null,
        cage_code: data.cage_code || null,
        relationship_status: data.relationship_status,
        relationship_started: data.relationship_started,
        notes: data.notes || null,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      toast.error(`Failed to create client: ${error.message}`)
      return null
    }

    set({ clients: [...get().clients, newClient].sort((a, b) => a.name.localeCompare(b.name)) })
    toast.success('Client created')
    return newClient
  },

  updateClient: async (id, data) => {
    const toast = useToastStore.getState()

    const { data: updated, error } = await supabase
      .from('clients')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      toast.error('Failed to update client')
      return null
    }

    set({
      clients: get().clients
        .map((c) => (c.id === id ? updated : c))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })
    return updated
  },

  deleteClient: async (id) => {
    const toast = useToastStore.getState()

    const { error } = await supabase.from('clients').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      // Most likely cause: engagements exist (ON DELETE RESTRICT). Surface a clear message.
      toast.error('Cannot delete client with existing engagements')
      return false
    }

    set({ clients: get().clients.filter((c) => c.id !== id) })
    toast.success('Client deleted')
    return true
  },

  getActiveClients: () => {
    return get().clients.filter(
      (c) => c.relationship_status === 'active' || c.relationship_status === 'pursuit'
    )
  },

  getClientById: (id) => get().clients.find((c) => c.id === id),

  getClientsByStatus: (status) =>
    get().clients.filter((c) => c.relationship_status === status),

  subscribeToChanges: () => {
    const channel = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        (payload) => {
          const clients = get().clients

          if (payload.eventType === 'INSERT') {
            set({
              clients: [...clients, payload.new as Client].sort((a, b) =>
                a.name.localeCompare(b.name)
              ),
            })
          } else if (payload.eventType === 'UPDATE') {
            set({
              clients: clients
                .map((c) =>
                  c.id === (payload.new as Client).id ? (payload.new as Client) : c
                )
                .sort((a, b) => a.name.localeCompare(b.name)),
            })
          } else if (payload.eventType === 'DELETE') {
            set({
              clients: clients.filter((c) => c.id !== (payload.old as Client).id),
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
