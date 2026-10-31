import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { act, fireEvent } from '@testing-library/react'
import { useSortableItem } from '../../hooks/use-sortable-item'
import { useSortableSensors } from '../../hooks/use-sortable-sensors'
import { keyboardSensorAttached } from './dnd-kit'

/**
 * A `useSortableItem` probe. The row carries `data-testid={id}`, and its grip
 * is a button with the name `id`.
 */
export function SortableItem({ id }: { id: string }) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style } = useSortableItem({ id })

	return (
		<div ref={setNodeRef} data-testid={id} style={style}>
			<button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners}>
				{id}
			</button>
		</div>
	)
}

/**
 * A sortable list of `SortableItem` rows on the default sensors of
 * `useSortableSensors`.
 *
 * @param ids - The ids of the rows, in order.
 * @param onDragCancel - Goes to the `DndContext`.
 */
export function SortableHarness({
	ids,
	onDragCancel,
}: {
	ids: string[]
	onDragCancel?: () => void
}) {
	const sensors = useSortableSensors()

	return (
		<DndContext sensors={sensors} onDragCancel={onDragCancel}>
			<SortableContext items={ids}>
				{ids.map((id) => (
					<SortableItem key={id} id={id} />
				))}
			</SortableContext>
		</DndContext>
	)
}

/** Lifts the grip with Space, and waits for the keyboard sensor to listen for keys. */
export async function lift(grip: HTMLElement): Promise<void> {
	grip.focus()

	await act(async () => {
		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })
	})

	await keyboardSensorAttached()
}
