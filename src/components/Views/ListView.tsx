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
import type { Item } from '@/types'
import clsx from 'clsx'

const columnHelper = createColumnHelper<Item>()

export default function ListView() {
  const { toggleComplete } = useItemStore()
  const { filters, openViewItemModal } = useViewStore()
  const getFilteredItems = useItemStore((state) => state.getFilteredItems)
  const [sorting, setSorting] = useState<SortingState>([])

  const filteredItems = useMemo(() => getFilteredItems(filters), [getFilteredItems, filters])

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'checkbox',
        header: '',
        cell: ({ row }) =>
          row.original.type === 'task' ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleComplete(row.original.id)
              }}
              className={clsx(
                'h-5 w-5 rounded-md border-2 transition-all-fast flex items-center justify-center',
                row.original.completed
                  ? 'border-theme-accent-success bg-theme-accent-success shadow-glow-success'
                  : 'border-theme-border-secondary hover:border-theme-accent-primary hover:shadow-glow-primary'
              )}
            >
              {row.original.completed && (
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
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

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="rounded-xl bg-theme-bg-card shadow-card border border-theme-border-primary transition-theme animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-theme-border-primary">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={clsx(
                      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-theme-text-muted',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-theme-accent-primary transition-all-fast'
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
                    index === table.getRowModel().rows.length - 1 && 'border-b-0'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm text-theme-text-primary">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredItems.length === 0 && (
          <div className="py-12 text-center text-theme-text-muted">
            <svg className="mx-auto h-12 w-12 text-theme-text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-2">No items found</p>
          </div>
        )}
      </div>
    </div>
  )
}
