import { useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useItemStore } from '@/stores/itemStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useViewStore } from '@/stores/viewStore'
import KanbanCard from './KanbanCard'
import type { Item, Category } from '@/types'

export default function KanbanView() {
  const { updateItem } = useItemStore()
  const { categories } = useCategoryStore()
  const { filters } = useViewStore()
  const getFilteredItems = useItemStore((state) => state.getFilteredItems)

  const filteredItems = useMemo(() => getFilteredItems(filters), [getFilteredItems, filters])

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string | null, Item[]>()

    // Initialize with all categories
    categories.forEach((cat) => grouped.set(cat.id, []))
    grouped.set(null, []) // Uncategorized

    // Group filtered items
    filteredItems.forEach((item) => {
      const categoryId = item.category_id
      const existing = grouped.get(categoryId) || []
      grouped.set(categoryId, [...existing, item])
    })

    return grouped
  }, [filteredItems, categories])

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    // If dropped in the same position, do nothing
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // Update item's category
    const newCategoryId = destination.droppableId === 'uncategorized' ? null : destination.droppableId
    await updateItem(draggableId, { category_id: newCategoryId })
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto pb-4">
        {/* Category columns */}
        {categories.map((category, index) => (
          <KanbanColumn
            key={category.id}
            category={category}
            items={itemsByCategory.get(category.id) || []}
            index={index}
          />
        ))}

        {/* Uncategorized column */}
        <KanbanColumn
          key="uncategorized"
          category={null}
          items={itemsByCategory.get(null) || []}
          index={categories.length}
        />
      </div>
    </DragDropContext>
  )
}

interface KanbanColumnProps {
  category: Category | null
  items: Item[]
  index: number
}

function KanbanColumn({ category, items, index }: KanbanColumnProps) {
  const droppableId = category?.id || 'uncategorized'

  return (
    <div
      className="flex w-72 shrink-0 flex-col rounded-xl bg-theme-bg-tertiary border border-theme-border-primary transition-theme animate-fade-in-up"
      style={{
        animationDelay: `${index * 50}ms`,
        background: 'var(--card-gradient)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-theme-border-primary">
        {category && (
          <span
            className="h-3 w-3 rounded-full category-dot shadow-sm"
            style={{ backgroundColor: category.color }}
          />
        )}
        <h3 className="font-semibold text-theme-text-primary tracking-tight">
          {category?.name || 'Uncategorized'}
        </h3>
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-theme-bg-hover text-xs font-medium text-theme-text-secondary">
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 space-y-2 overflow-y-auto p-2 transition-all-fast ${
              snapshot.isDraggingOver ? 'bg-theme-accent-primary/10' : ''
            }`}
          >
            {items.map((item, itemIndex) => (
              <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      transform: snapshot.isDragging
                        ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                        : provided.draggableProps.style?.transform,
                    }}
                  >
                    <KanbanCard item={item} isDragging={snapshot.isDragging} />
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
}
