import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ViewType, ItemFilters } from '@/types'

interface ViewState {
  currentView: ViewType
  sidebarOpen: boolean
  filters: ItemFilters

  // Modal state
  itemModalOpen: boolean
  itemModalMode: 'create' | 'edit' | 'view'
  itemModalType: 'task' | 'event'
  selectedItemId: string | null

  // Actions
  setCurrentView: (view: ViewType) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setFilters: (filters: Partial<ItemFilters>) => void
  resetFilters: () => void

  // Modal actions
  openCreateTaskModal: () => void
  openCreateEventModal: () => void
  openEditItemModal: (itemId: string) => void
  openViewItemModal: (itemId: string) => void
  closeItemModal: () => void
}

const defaultFilters: ItemFilters = {
  search: '',
  types: [],
  category_ids: [],
  sources: [],
  status: 'all',
  date_range: {
    start: null,
    end: null,
  },
}

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      currentView: 'kanban',
      sidebarOpen: true,
      filters: defaultFilters,

      itemModalOpen: false,
      itemModalMode: 'create',
      itemModalType: 'task',
      selectedItemId: null,

      setCurrentView: (view) => set({ currentView: view }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      resetFilters: () => set({ filters: defaultFilters }),

      openCreateTaskModal: () =>
        set({
          itemModalOpen: true,
          itemModalMode: 'create',
          itemModalType: 'task',
          selectedItemId: null,
        }),

      openCreateEventModal: () =>
        set({
          itemModalOpen: true,
          itemModalMode: 'create',
          itemModalType: 'event',
          selectedItemId: null,
        }),

      openEditItemModal: (itemId) =>
        set({
          itemModalOpen: true,
          itemModalMode: 'edit',
          selectedItemId: itemId,
        }),

      openViewItemModal: (itemId) =>
        set({
          itemModalOpen: true,
          itemModalMode: 'view',
          selectedItemId: itemId,
        }),

      closeItemModal: () =>
        set({
          itemModalOpen: false,
          selectedItemId: null,
        }),
    }),
    {
      name: 'takt-view-store',
      partialize: (state) => ({
        currentView: state.currentView,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
