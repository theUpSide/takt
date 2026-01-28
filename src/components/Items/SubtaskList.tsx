import { useState } from 'react'
import { useItemStore } from '@/stores/itemStore'
import { useViewStore } from '@/stores/viewStore'
import Checkbox from '@/components/Common/Checkbox'
import ProgressRing from '@/components/Common/ProgressRing'
import type { Item } from '@/types'
import clsx from 'clsx'

interface SubtaskListProps {
  parentId: string
  defaultExpanded?: boolean
}

export default function SubtaskList({ parentId, defaultExpanded = true }: SubtaskListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const { getSubtasks, getSubtaskProgress, toggleComplete, createSubtask } = useItemStore()
  const { openViewItemModal } = useViewStore()

  const subtasks = getSubtasks(parentId)
  const progress = getSubtaskProgress(parentId)

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubtaskTitle.trim()) return

    setIsAdding(true)
    await createSubtask(parentId, {
      type: 'task',
      title: newSubtaskTitle.trim(),
    })
    setNewSubtaskTitle('')
    setIsAdding(false)
  }

  if (subtasks.length === 0 && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-sm text-theme-accent-primary hover:text-theme-accent-primary/80 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add subtask
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-theme-text-secondary hover:text-theme-text-primary transition-colors"
        >
          <svg
            className={clsx(
              'h-4 w-4 transition-transform duration-200',
              expanded && 'rotate-90'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Subtasks
          <span className="rounded-full bg-theme-bg-tertiary px-2 py-0.5 text-xs font-medium text-theme-text-muted">
            {progress.completed}/{progress.total}
          </span>
        </button>

        {subtasks.length > 0 && (
          <ProgressRing percentage={progress.percentage} size="sm" />
        )}
      </div>

      {/* Subtask list */}
      {expanded && (
        <div className="space-y-2 pl-6 border-l-2 border-theme-border-secondary">
          {subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onToggle={() => toggleComplete(subtask.id)}
              onClick={() => openViewItemModal(subtask.id)}
            />
          ))}

          {/* Add subtask form */}
          <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
            <div className="h-4 w-4 flex items-center justify-center">
              <svg
                className="h-3 w-3 text-theme-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add a subtask..."
              disabled={isAdding}
              className="flex-1 bg-transparent text-sm text-theme-text-primary placeholder-theme-text-muted focus:outline-none"
            />
            {newSubtaskTitle.trim() && (
              <button
                type="submit"
                disabled={isAdding}
                className="text-xs text-theme-accent-primary hover:text-theme-accent-primary/80 font-medium disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : 'Add'}
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  )
}

interface SubtaskItemProps {
  subtask: Item
  onToggle: () => void
  onClick: () => void
}

function SubtaskItem({ subtask, onToggle, onClick }: SubtaskItemProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 py-1 px-2 -ml-2 rounded-md cursor-pointer transition-colors',
        'hover:bg-theme-bg-hover',
        subtask.completed && 'opacity-60'
      )}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={subtask.completed}
          onChange={onToggle}
          size="sm"
        />
      </div>
      <span
        onClick={onClick}
        className={clsx(
          'flex-1 text-sm',
          subtask.completed
            ? 'text-theme-text-muted line-through'
            : 'text-theme-text-primary'
        )}
      >
        {subtask.title}
      </span>
    </div>
  )
}
