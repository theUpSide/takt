import { useCategoryStore } from '@/stores/categoryStore'
import { useViewStore } from '@/stores/viewStore'
import CategoryBadge from '@/components/Common/CategoryBadge'
import clsx from 'clsx'

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { categories, loading } = useCategoryStore()
  const { filters, setFilters } = useViewStore()

  const toggleCategoryFilter = (categoryId: string) => {
    const current = filters.category_ids
    if (current.includes(categoryId)) {
      setFilters({ category_ids: current.filter((id) => id !== categoryId) })
    } else {
      setFilters({ category_ids: [...current, categoryId] })
    }
  }

  const clearCategoryFilters = () => {
    setFilters({ category_ids: [] })
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          // Mobile: fixed drawer from left
          'fixed inset-y-0 left-0 z-40 md:static md:z-0',
          // Width: full on mobile (max 280px), fixed on desktop
          'w-full max-w-[280px] md:w-64 md:max-w-none',
          // Slide transition
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden',
          // Desktop: hide when closed (keep mobile behavior via translate)
          !isOpen && 'md:!hidden',
          // Base styles
          'shrink-0 border-r border-theme-border-primary bg-theme-bg-primary transition-theme'
        )}
        style={{ background: 'var(--sidebar-gradient)' }}
      >
      <div className="flex h-full flex-col">
        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search items..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary py-2 pl-10 pr-4 text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-accent-primary focus:outline-none focus-glow transition-all-fast"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
              Categories
            </h2>
            {filters.category_ids.length > 0 && (
              <button
                onClick={clearCategoryFilters}
                className="text-xs text-theme-accent-primary hover:text-theme-accent-secondary transition-all-fast"
              >
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 skeleton rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {categories.map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => toggleCategoryFilter(category.id)}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all-fast btn-press',
                    filters.category_ids.includes(category.id)
                      ? 'bg-theme-accent-primary/20 text-theme-accent-primary border border-theme-accent-primary/30'
                      : 'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CategoryBadge color={category.color} />
                  <span className="font-medium">{category.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status filters */}
        <div className="border-t border-theme-border-primary p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
            Status
          </h2>
          <div className="space-y-1">
            {(['all', 'pending', 'completed', 'overdue'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilters({ status })}
                className={clsx(
                  'w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all-fast btn-press',
                  filters.status === status
                    ? 'bg-theme-accent-primary/20 text-theme-accent-primary border border-theme-accent-primary/30'
                    : 'text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary',
                  status === 'overdue' && filters.status === status && 'bg-theme-accent-danger/20 text-theme-accent-danger border-theme-accent-danger/30'
                )}
              >
                <span className="flex items-center gap-2">
                  {status === 'pending' && (
                    <span className="h-2 w-2 rounded-full bg-theme-accent-warning" />
                  )}
                  {status === 'completed' && (
                    <span className="h-2 w-2 rounded-full bg-theme-accent-success" />
                  )}
                  {status === 'overdue' && (
                    <span className="h-2 w-2 rounded-full bg-theme-accent-danger animate-pulse" />
                  )}
                  {status === 'all' && (
                    <span className="h-2 w-2 rounded-full bg-theme-text-muted" />
                  )}
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
    </>
  )
}
