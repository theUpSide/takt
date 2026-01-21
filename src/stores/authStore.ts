import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean

  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return

    // Get initial session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    set({
      session,
      user: session?.user ?? null,
      loading: false,
      initialized: true,
    })

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
      })
    })
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true })

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    set({ loading: false })
    return { error: error as Error | null }
  },

  signUp: async (email: string, password: string) => {
    set({ loading: true })

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    set({ loading: false })
    return { error: error as Error | null }
  },

  signOut: async () => {
    set({ loading: true })
    await supabase.auth.signOut()
    set({ user: null, session: null, loading: false })
  },

  signInWithMagicLink: async (email: string) => {
    set({ loading: true })

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
      },
    })

    set({ loading: false })
    return { error: error as Error | null }
  },
}))

// Initialize auth on module load
useAuthStore.getState().initialize()
