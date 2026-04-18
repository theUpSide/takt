import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useEngagementStore } from '@/stores/engagementStore'
import { useClientStore } from '@/stores/clientStore'
import { PURSUIT_STAGES, ENGAGEMENT_TYPES } from '@/types/engagement'
import type { Engagement, PursuitStage, EngagementType } from '@/types/engagement'
import clsx from 'clsx'

/**
 * Pipeline view: Kanban over pursuit-type engagements, one column per
 * stage. Drag a card between columns to update its stage. Cards also
 * expose a "Convert" action that flips the engagement type (hourly,
 * retainer, fixed) so it leaves the pipeline as a won deal, and a
 * "Mark Lost" action that sets status=lost.
 */
export default function PipelineView() {
  const { engagements, updateEngagement } = useEngagementStore()
  const { clients } = useClientStore()

  const pursuits = useMemo(
    () =>
      engagements.filter(
        (e) => e.engagement_type === 'pursuit' && e.status !== 'lost' && e.status !== 'complete'
      ),
    [engagements]
  )

  const byStage = useMemo(() => {
    const grouped = new Map<PursuitStage, Engagement[]>()
    for (const stage of PURSUIT_STAGES) grouped.set(stage.value, [])
    for (const p of pursuits) {
      const stage = (p.pursuit_stage ?? 'initial_contact') as PursuitStage
      grouped.get(stage)?.push(p)
    }
    // Sort each column: newest pursuits first (recently created tend to need attention)
    for (const list of grouped.values()) {
      list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    }
    return grouped
  }, [pursuits])

  const clientNameById = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients]
  )

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    await updateEngagement(draggableId, {
      pursuit_stage: destination.droppableId as PursuitStage,
    })
  }

  const totalPursuits = pursuits.length

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-xl font-semibold text-theme-text-primary">Pipeline</h1>
        <p className="mt-0.5 text-sm text-theme-text-muted">
          {totalPursuits} active pursuit{totalPursuits === 1 ? '' : 's'}. Drag cards between stages
          as things progress.
        </p>
      </div>

      {totalPursuits === 0 ? (
        <div className="rounded-lg border border-dashed border-theme-border-primary py-12 text-center">
          <p className="text-sm text-theme-text-muted">No active pursuits.</p>
          <p className="mt-1 text-xs text-theme-text-muted/70">
            Create an engagement with type "Pursuit" from a client page to add one.
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex h-full gap-3 md:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
            {PURSUIT_STAGES.map((stage) => {
              const items = byStage.get(stage.value) ?? []
              return (
                <div
                  key={stage.value}
                  className="flex w-72 md:w-80 shrink-0 flex-col rounded-xl bg-theme-bg-card border border-theme-border-primary shadow-sm snap-start"
                >
                  <div className="flex items-center justify-between border-b border-theme-border-primary px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-theme-text-primary">
                        {stage.label}
                      </span>
                      <span className="rounded-full bg-theme-bg-tertiary px-2 py-0.5 text-xs font-medium text-theme-text-muted">
                        {items.length}
                      </span>
                    </div>
                  </div>

                  <Droppable droppableId={stage.value}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={clsx(
                          'flex-1 overflow-y-auto p-2 transition-colors',
                          snapshot.isDraggingOver && 'bg-theme-accent-primary/5'
                        )}
                      >
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <div className="py-8 text-center text-xs text-theme-text-muted italic">
                            Drop here
                          </div>
                        )}
                        {items.map((engagement, idx) => (
                          <Draggable
                            key={engagement.id}
                            draggableId={engagement.id}
                            index={idx}
                          >
                            {(p, s) => (
                              <div
                                ref={p.innerRef}
                                {...p.draggableProps}
                                {...p.dragHandleProps}
                                className={clsx(
                                  'mb-2 last:mb-0',
                                  s.isDragging && 'opacity-90 rotate-1'
                                )}
                                style={p.draggableProps.style}
                              >
                                <PursuitCard
                                  engagement={engagement}
                                  clientName={clientNameById.get(engagement.client_id) ?? '—'}
                                  onConvert={(type) =>
                                    updateEngagement(engagement.id, {
                                      engagement_type: type,
                                      status: 'active',
                                      pursuit_stage: null,
                                    })
                                  }
                                  onMarkLost={() =>
                                    updateEngagement(engagement.id, { status: 'lost' })
                                  }
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  )
}

interface CardProps {
  engagement: Engagement
  clientName: string
  onConvert: (type: EngagementType) => void
  onMarkLost: () => void
}

function PursuitCard({ engagement, clientName, onConvert, onMarkLost }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(engagement.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  const stale = daysSinceUpdate > 14

  return (
    <div className="rounded-lg border border-theme-border-primary bg-theme-bg-secondary p-3 text-sm shadow-sm hover:border-theme-accent-primary/50 transition-all-fast">
      <div className="flex items-start justify-between gap-2 mb-1">
        <Link
          to={`/app/engagements/${engagement.id}`}
          className="font-medium text-theme-text-primary hover:text-theme-accent-primary flex-1 min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          {engagement.title}
        </Link>
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className="rounded p-1 text-theme-text-muted hover:bg-theme-bg-hover hover:text-theme-text-primary transition-all-fast"
            aria-label="Card actions"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-6 z-50 w-56 rounded-lg border border-theme-border-primary bg-theme-bg-card shadow-xl overflow-hidden">
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-theme-text-muted bg-theme-bg-tertiary">
                  Convert to Won
                </div>
                {ENGAGEMENT_TYPES.filter((t) => t.value !== 'pursuit').map((t) => (
                  <button
                    key={t.value}
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onConvert(t.value as EngagementType)
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-theme-text-primary hover:bg-theme-bg-hover transition-all-fast"
                  >
                    {t.label}
                  </button>
                ))}
                <div className="border-t border-theme-border-primary" />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onMarkLost()
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-all-fast"
                >
                  Mark Lost
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="text-xs text-theme-text-muted truncate">{clientName}</div>

      {engagement.scope_description && (
        <div className="mt-1.5 text-xs text-theme-text-secondary line-clamp-2">
          {engagement.scope_description}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-theme-text-muted">
          {engagement.start_date ? `Started ${engagement.start_date}` : 'No start date'}
        </span>
        <span className={clsx('text-xs', stale ? 'text-red-400 font-medium' : 'text-theme-text-muted')}>
          {daysSinceUpdate === 0
            ? 'Updated today'
            : `${daysSinceUpdate}d since update`}
        </span>
      </div>
    </div>
  )
}
