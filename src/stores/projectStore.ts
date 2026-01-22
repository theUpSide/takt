import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectStatus } from '@/types'

interface ProjectState {
  projects: Project[]
  loading: boolean
  error: string | null

  // Actions
  fetchProjects: () => Promise<void>
  createProject: (data: Partial<Project>) => Promise<Project | null>
  updateProject: (id: string, data: Partial<Project>) => Promise<Project | null>
  deleteProject: (id: string) => Promise<boolean>
  setProjectStatus: (id: string, status: ProjectStatus) => Promise<boolean>
  getActiveProjects: () => Project[]
  subscribeToChanges: () => () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ projects: data ?? [], loading: false })
  },

  createProject: async (data) => {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) {
      set({ error: 'Not authenticated' })
      return null
    }

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        user_id: session.session.user.id,
        title: data.title ?? 'New Project',
        description: data.description ?? null,
        color: data.color ?? '#6366f1',
        target_date: data.target_date ?? null,
        status: data.status ?? 'active',
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    set({ projects: [newProject, ...get().projects] })
    return newProject
  },

  updateProject: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('projects')
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
      projects: get().projects.map((p) => (p.id === id ? updated : p)),
    })
    return updated
  },

  deleteProject: async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }

    set({
      projects: get().projects.filter((p) => p.id !== id),
    })
    return true
  },

  setProjectStatus: async (id, status) => {
    const updated = await get().updateProject(id, { status })
    return !!updated
  },

  getActiveProjects: () => {
    return get().projects.filter((p) => p.status === 'active')
  },

  subscribeToChanges: () => {
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          const projects = get().projects

          if (payload.eventType === 'INSERT') {
            set({ projects: [payload.new as Project, ...projects] })
          } else if (payload.eventType === 'UPDATE') {
            set({
              projects: projects.map((p) =>
                p.id === (payload.new as Project).id ? (payload.new as Project) : p
              ),
            })
          } else if (payload.eventType === 'DELETE') {
            set({
              projects: projects.filter((p) => p.id !== (payload.old as Project).id),
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
