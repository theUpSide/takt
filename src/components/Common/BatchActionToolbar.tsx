import { useState, useRef, useEffect } from 'react'
import { useViewStore } from '@/stores/viewStore'
import { useItemStore } from '@/stores/itemStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useProjectStore } from '@/stores/projectStore'
import clsx from 'clsx'

export default function BatchActionToolbar() {
  const {
    selectionMode,
    selectedItemIds,
    exitSelectionMode,
    clearSelection,
  } = useViewStore()

  const {
    batchDelete,
    batchComplete,
    batchUncomplete,
    batchUpdateCategory,
    batchAssignProject,
  } = useItemStore()

  const { categories } = useCategoryStore()
  const { getActiveProjects } = useProjectStore()

  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const categoryRef = useRef<HTMLDivElement>(null)
  const projectRef = useRef<HTMLDivElement>(null)

  const selectedCount = selectedItemIds.length

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false)
      }
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset confirm delete when selection changes
  useEffect(() => {
    setConfirmDelete(false)
  }, [selectedItemIds])

  if (!selectionMode) return null

  const handleComplete = async () => {
    await batchComplete(selectedItemIds)
    clearSelection()
  }

  const handleUncomplete = async () => {
    await batchUncomplete(selectedItemIds)
    clearSelection()
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await batchDelete(selectedItemIds)
    clearSelection()
    exitSelectionMode()
  }

  const handleSetCategory = async (categoryId: string | null) => {
    await batchUpdateCategory(selectedItemIds, categoryId)
    setCategoryDropdownOpen(false)
    clearSelection()
  }

  const handleSetProject = async (projectId: string | null) => {
    await batchAssignProject(selectedItemIds, projectId)
    setProjectDropdownOpen(false)
    clearSelection()
  }

  const handleExit = () => {
    exitSelectionMode()
  }

  const activeProjects = getActiveProjects()

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-2 rounded-xl bg-theme-bg-card border border-theme-border-primary shadow-lg px-4 py-3">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-theme-border-primary">
          <span className="text-sm font-medium text-theme-text-primary">
            {selectedCount} selected
          </span>
          <button
            onClick={handleExit}
            className="p-1 rounded-md hover:bg-theme-bg-hover text-theme-text-muted hover:text-theme-text-primary transition-all-fast"
            title="Exit selection mode"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Complete */}
          <button
            onClick={handleComplete}
            disabled={selectedCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-theme-text-secondary hover:bg-theme-accent-success/10 hover:text-theme-accent-success disabled:opacity-50 disabled:cursor-not-allowed transition-all-fast btn-press"
            title="Mark as complete"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">Complete</span>
          </button>

          {/* Reopen */}
          <button
            onClick={handleUncomplete}
            disabled={selectedCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-theme-text-secondary hover:bg-theme-accent-warning/10 hover:text-theme-accent-warning disabled:opacity-50 disabled:cursor-not-allowed transition-all-fast btn-press"
            title="Reopen tasks"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Reopen</span>
          </button>

          {/* Category dropdown */}
          <div ref={categoryRef} className="relative">
            <button
              onClick={() => {
                setCategoryDropdownOpen(!categoryDropdownOpen)
                setProjectDropdownOpen(false)
              }}
              disabled={selectedCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all-fast btn-press"
              title="Set category"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="hidden sm:inline">Category</span>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {categoryDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-48 rounded-lg bg-theme-bg-card border border-theme-border-primary shadow-lg overflow-hidden animate-fade-in">
                <button
                  onClick={() => handleSetCategory(null)}
                  className="w-full px-3 py-2 text-left text-sm text-theme-text-muted hover:bg-theme-bg-hover transition-all-fast"
                >
                  No Category
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSetCategory(cat.id)}
                    className="w-full px-3 py-2 text-left text-sm text-theme-text-primary hover:bg-theme-bg-hover transition-all-fast flex items-center gap-2"
                  >
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Project dropdown */}
          <div ref={projectRef} className="relative">
            <button
              onClick={() => {
                setProjectDropdownOpen(!projectDropdownOpen)
                setCategoryDropdownOpen(false)
              }}
              disabled={selectedCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-theme-text-secondary hover:bg-theme-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all-fast btn-press"
              title="Assign to project"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="hidden sm:inline">Project</span>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {projectDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-48 rounded-lg bg-theme-bg-card border border-theme-border-primary shadow-lg overflow-hidden animate-fade-in">
                <button
                  onClick={() => handleSetProject(null)}
                  className="w-full px-3 py-2 text-left text-sm text-theme-text-muted hover:bg-theme-bg-hover transition-all-fast"
                >
                  No Project
                </button>
                {activeProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => handleSetProject(proj.id)}
                    className="w-full px-3 py-2 text-left text-sm text-theme-text-primary hover:bg-theme-bg-hover transition-all-fast flex items-center gap-2"
                  >
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color }}
                    />
                    {proj.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={selectedCount === 0}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all-fast btn-press',
              confirmDelete
                ? 'bg-theme-accent-danger text-white'
                : 'text-theme-text-secondary hover:bg-theme-accent-danger/10 hover:text-theme-accent-danger',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title={confirmDelete ? 'Click again to confirm' : 'Delete selected'}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden sm:inline">
              {confirmDelete ? 'Confirm' : 'Delete'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
