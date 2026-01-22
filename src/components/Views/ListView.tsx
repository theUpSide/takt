import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'
import { useItemStore } from '@/stores/itemStore'
import { useViewStore } from '@/stores/viewStore'
import { getRelativeDate, isOverdue } from '@/lib/dateUtils'
import CategoryBadge from '@/components/Common/CategoryBadge'
import Checkbox from '@/components/Common/Checkbox'
import type { Item } from '@/types'
import clsx from 'clsx'

const columnHelper = createColumnHelper<Item>()

export default function ListView() {
  const { items, toggleComplete } = useItemStore()
  const { filters, openViewItemModal } = useViewStore()
  const getFilteredItems = useItemStore((state) => state.getFilteredItems)
  const [sorting, setSorting] = useState<SortingState>([])
  const [completedExpanded, setCompletedExpanded] = useState(false)

  const filteredItems = useMemo(() => getFilteredItems(filters), [getFilteredItems, filters, items])

  // Split into active and completed
  const { activeItems, completedItems } = useMemo(() => {
    const active: Item[] = []
    const completed: Item[] = []

    filteredItems.forEach(item => {
      if (item.completed) {
        completed.push(item)
      } else {
        active.push(item)
      }
    })

    return { activeItems: active, completedItems: completed }
  }, [filteredItems])

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'checkbox',
        header: '',
        cell: ({ row }) =>
          row.original.type === 'task' ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={row.original.completed}
                onChange={() => toggleComplete(row.original.id)}
              />
            </div>
          ) : null,
        size: 40,
      }),
      columnHelper.accessor('title', {
        header: 'Title',
        cell: ({ row, getValue }) => (
          <span
            className={clsx(
              'font-medium',
              row.original.completed && 'text-theme-text-muted line-through'
            )}
          >
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: ({ getValue }) => (
          <span
            className={clsx(
              'rounded-md px-2 py-0.5 text-xs font-medium',
              getValue() === 'task'
                ? 'bg-theme-accent-primary/20 text-theme-accent-primary'
                : 'bg-theme-accent-secondary/20 text-theme-accent-secondary'
            )}
          >
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: ({ getValue }) => {
          const category = getValue()
          return category ? (
            <CategoryBadge color={category.color} name={category.name} />
          ) : (
            <span className="text-theme-text-muted">—</span>
          )
        },
      }),
      columnHelper.accessor((row) => row.due_date || row.start_time, {
        id: 'date',
        header: 'Date',
        cell: ({ row, getValue }) => {
          const date = getValue()
          if (!date) return <span className="text-theme-text-muted">—</span>

          const overdue = row.original.due_date ? isOverdue(row.original.due_date) : false
          const completed = row.original.completed

          return (
            <span
              className={clsx(
                'flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                completed
                  ? 'text-theme-text-muted bg-theme-bg-tertiary'
                  : overdue
                  ? 'text-theme-accent-danger bg-theme-accent-danger/10'
                  : 'text-theme-accent-warning bg-theme-accent-warning/10'
              )}
            >
              {getRelativeDate(date)}
            </span>
          )
        },
      }),
      columnHelper.accessor('source', {
        header: 'Source',
        cell: ({ getValue }) => (
          <span className="text-xs text-theme-text-muted capitalize">{getValue()}</span>
        ),
      }),
    ],
    [toggleComplete]
  )

  const activeTable = useReactTable({
    data: activeItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const completedTable = useReactTable({
    data: completedItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Columns to hide on mobile
  const mobileHiddenColumns = ['category', 'source', 'type']

  const renderTableHeader = (table: ReturnType<typeof useReactTable<Item>>) => (
    <thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id} className="border-b border-theme-border-primary">
          {headerGroup.headers.map((header) => (
            <th
              key={header.id}
              onClick={header.column.getToggleSortingHandler()}
              className={clsx(
                'px-2 md:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-theme-text-muted',
                header.column.getCanSort() && 'cursor-pointer select-none hover:text-theme-accent-primary transition-all-fast',
                // Hide certain columns on mobile
                mobileHiddenColumns.includes(header.id) && 'hidden md:table-cell'
              )}
              style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
            >
              <div className="flex items-center gap-1">
                {flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getIsSorted() === 'asc' && (
                  <span className="text-theme-accent-primary">↑</span>
                )}
                {header.column.getIsSorted() === 'desc' && (
                  <span className="text-theme-accent-primary">↓</span>
                )}
              </div>
            </th>
          ))}
        </tr>
      ))}
    </thead>
  )

  const renderTableRows = (table: ReturnType<typeof useReactTable<Item>>, startIndex = 0) => (
    <tbody>
      {table.getRowModel().rows.map((row, index) => {
        const overdue = row.original.due_date ? isOverdue(row.original.due_date) && !row.original.completed : false
        return (
          <tr
            key={row.id}
            onClick={() => openViewItemModal(row.original.id)}
            className={clsx(
              'cursor-pointer border-b border-theme-border-primary hover:bg-theme-bg-hover transition-all-fast',
              overdue && 'bg-theme-accent-danger/5',
              row.original.completed && 'opacity-60'
            )}
            style={{ animationDelay: `${(startIndex + index) * 30}ms` }}
          >
            {row.getVisibleCells().map((cell) => (
              <td
                key={cell.id}
                className={clsx(
                  'px-2 md:px-4 py-3 text-sm text-theme-text-primary min-h-[44px]',
                  // Hide certain columns on mobile
                  mobileHiddenColumns.includes(cell.column.id) && 'hidden md:table-cell'
                )}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        )
      })}
    </tbody>
  )

  return (
    <div className="space-y-4">
      {/* Active Items */}
      <div className="rounded-xl bg-theme-bg-card shadow-card border border-theme-border-primary transition-theme animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            {renderTableHeader(activeTable)}
            {renderTableRows(activeTable)}
          </table>

          {activeItems.length === 0 && (
            <div className="py-12 text-center text-theme-text-muted">
              <svg className="mx-auto h-12 w-12 text-theme-text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2">All caught up!</p>
            </div>
          )}
        </div>
      </div>

      {/* Completed Items - Collapsible */}
      {completedItems.length > 0 && (
        <div className="rounded-xl bg-theme-bg-card shadow-card border border-theme-border-primary transition-theme">
          <button
            onClick={() => setCompletedExpanded(!completedExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-theme-bg-hover transition-all-fast rounded-xl"
          >
            <div className="flex items-center gap-2">
              <svg
                className={clsx(
                  'h-4 w-4 text-theme-text-muted transition-transform',
                  completedExpanded && 'rotate-90'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-sm font-medium text-theme-text-secondary">
                Completed
              </span>
              <span className="rounded-full bg-theme-bg-tertiary px-2 py-0.5 text-xs font-medium text-theme-text-muted">
                {completedItems.length}
              </span>
            </div>
            <svg
              className="h-4 w-4 text-theme-accent-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>

          {completedExpanded && (
            <div className="border-t border-theme-border-primary overflow-x-auto">
              <table className="w-full">
                {renderTableRows(completedTable, activeItems.length)}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
