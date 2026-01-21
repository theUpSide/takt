import { useViewStore } from '@/stores/viewStore'
import { useItemStore } from '@/stores/itemStore'
import Modal from '@/components/Common/Modal'
import TaskForm from './TaskForm'
import EventForm from './EventForm'
import ItemDetail from './ItemDetail'

export default function ItemModal() {
  const { itemModalOpen, itemModalMode, itemModalType, selectedItemId, closeItemModal } =
    useViewStore()
  const { items } = useItemStore()

  const selectedItem = selectedItemId ? items.find((i) => i.id === selectedItemId) : null

  const getTitle = () => {
    if (itemModalMode === 'view') return selectedItem?.title || 'Item'
    if (itemModalMode === 'edit') return `Edit ${selectedItem?.type || 'Item'}`
    return itemModalType === 'task' ? 'New Task' : 'New Event'
  }

  return (
    <Modal isOpen={itemModalOpen} onClose={closeItemModal} title={getTitle()} size="lg">
      {itemModalMode === 'view' && selectedItem && <ItemDetail item={selectedItem} />}
      {itemModalMode === 'edit' && selectedItem && (
        <>
          {selectedItem.type === 'task' ? (
            <TaskForm item={selectedItem} onSuccess={closeItemModal} />
          ) : (
            <EventForm item={selectedItem} onSuccess={closeItemModal} />
          )}
        </>
      )}
      {itemModalMode === 'create' && (
        <>
          {itemModalType === 'task' ? (
            <TaskForm onSuccess={closeItemModal} />
          ) : (
            <EventForm onSuccess={closeItemModal} />
          )}
        </>
      )}
    </Modal>
  )
}
