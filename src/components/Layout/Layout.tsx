import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import { useViewStore } from '@/stores/viewStore'
import { useItemStore } from '@/stores/itemStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useThemeStore } from '@/stores/themeStore'
import { useTimekeepingStore } from '@/stores/timekeepingStore'
import { useClientStore } from '@/stores/clientStore'
import { useEngagementStore } from '@/stores/engagementStore'
import ItemModal from '@/components/Items/ItemModal'
import BatchActionToolbar from '@/components/Common/BatchActionToolbar'

export default function Layout() {
  const sidebarOpen = useViewStore((state) => state.sidebarOpen)
  const setSidebarOpen = useViewStore((state) => state.setSidebarOpen)
  const { fetchItems, fetchDependencies, subscribeToChanges: subscribeItems } = useItemStore()
  const { fetchCategories, subscribeToChanges: subscribeCategories } = useCategoryStore()
  const theme = useThemeStore((state) => state.theme)
  const {
    fetchTimeEntries,
    fetchExpenses,
    fetchChargeAccounts,
    subscribeToChanges: subscribeTimekeeping,
  } = useTimekeepingStore()
  const { fetchClients, subscribeToChanges: subscribeClients } = useClientStore()
  const { fetchEngagements, subscribeToChanges: subscribeEngagements } = useEngagementStore()

  useEffect(() => {
    // Fetch initial data
    fetchItems()
    fetchDependencies()
    fetchCategories()
    fetchTimeEntries()
    fetchExpenses()
    fetchChargeAccounts()
    fetchClients()
    fetchEngagements()

    // Subscribe to real-time updates
    const unsubItems = subscribeItems()
    const unsubCategories = subscribeCategories()
    const unsubTimekeeping = subscribeTimekeeping()
    const unsubClients = subscribeClients()
    const unsubEngagements = subscribeEngagements()

    return () => {
      unsubItems()
      unsubCategories()
      unsubTimekeeping()
      unsubClients()
      unsubEngagements()
    }
  }, [
    fetchItems,
    fetchDependencies,
    fetchCategories,
    subscribeItems,
    subscribeCategories,
    fetchTimeEntries,
    fetchExpenses,
    fetchChargeAccounts,
    subscribeTimekeeping,
    fetchClients,
    subscribeClients,
    fetchEngagements,
    subscribeEngagements,
  ])

  // Apply theme class to document element
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-takt', 'theme-default', 'theme-midnight', 'theme-matrix', 'theme-light')
    root.classList.add(`theme-${theme}`)
  }, [theme])

  return (
    <div className="flex h-screen flex-col bg-theme-bg-secondary transition-theme">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-auto p-4 md:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
      <ItemModal />
      <BatchActionToolbar />
    </div>
  )
}
