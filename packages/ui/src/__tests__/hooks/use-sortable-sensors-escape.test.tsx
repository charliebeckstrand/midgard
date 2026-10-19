import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useEscapeLayer } from '../../hooks/use-escape-layer'
import { useSortableItem } from '../../hooks/use-sortable-item'
import { useSortableSensors } from '../../hooks/use-sortable-sensors'
import { renderUI } from '../helpers'
import { keyboardSensorAttached, pointerSensorDetached } from '../helpers/dnd-kit'

/**
 * A drag inside a dismissable surface, such as a dialog. Each sensor of dnd-kit
 * cancels its drag on Escape. The surface must not close on that press.
 */
function Item({ id }: { id: string }) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style } = useSortableItem({ id })

	return (
		<div ref={setNodeRef} style={style}>
			<button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners}>
				{id}
			</button>
		</div>
	)
}

function Harness({ onDismiss, onDragCancel }: { onDismiss: () => void; onDragCancel: () => void }) {
	useEscapeLayer({ open: true, onDismiss })

	const sensors = useSortableSensors()

	return (
		<DndContext sensors={sensors} onDragCancel={onDragCancel}>
			<SortableContext items={['a', 'b']}>
				<Item id="a" />
				<Item id="b" />
			</SortableContext>
		</DndContext>
	)
}

/** Lifts the grip with Space, and waits for the sensor to listen for keys. */
async function lift(grip: HTMLElement) {
	grip.focus()

	await act(async () => {
		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })
	})

	await keyboardSensorAttached()
}

async function press(target: HTMLElement, code: string, key: string) {
	await act(async () => {
		fireEvent.keyDown(target, { code, key })
	})
}

describe('useSortableSensors in a dismissable surface', () => {
	it('cancels a keyboard drag on Escape and keeps the surface open', async () => {
		const onDismiss = vi.fn()

		const onDragCancel = vi.fn()

		renderUI(<Harness onDismiss={onDismiss} onDragCancel={onDragCancel} />)

		const grip = screen.getByRole('button', { name: 'a' })

		await lift(grip)

		await press(grip, 'Escape', 'Escape')

		expect(onDragCancel).toHaveBeenCalledTimes(1)

		expect(onDismiss).not.toHaveBeenCalled()

		// With no drag, the next Escape reaches the surface.
		await press(grip, 'Escape', 'Escape')

		expect(onDismiss).toHaveBeenCalledTimes(1)
	})

	it('cancels a pointer drag on Escape and keeps the surface open', async () => {
		const onDismiss = vi.fn()

		const onDragCancel = vi.fn()

		renderUI(<Harness onDismiss={onDismiss} onDragCancel={onDragCancel} />)

		const grip = screen.getByRole('button', { name: 'a' })

		const pointer = { isPrimary: true, button: 0, pointerId: 1 }

		await act(async () => {
			fireEvent.pointerDown(grip, { ...pointer, clientX: 0, clientY: 0 })
		})

		// Past the travel that activates a drag.
		await act(async () => {
			fireEvent.pointerMove(grip, { ...pointer, clientX: 0, clientY: 20 })
		})

		await press(grip, 'Escape', 'Escape')

		expect(onDragCancel).toHaveBeenCalledTimes(1)

		expect(onDismiss).not.toHaveBeenCalled()

		await press(grip, 'Escape', 'Escape')

		expect(onDismiss).toHaveBeenCalledTimes(1)

		await pointerSensorDetached()
	})

	it('gives Escape back to the surface after a drop', async () => {
		const onDismiss = vi.fn()

		renderUI(<Harness onDismiss={onDismiss} onDragCancel={() => {}} />)

		const grip = screen.getByRole('button', { name: 'a' })

		await lift(grip)

		await press(grip, 'Space', ' ')

		await press(grip, 'Escape', 'Escape')

		expect(onDismiss).toHaveBeenCalledTimes(1)
	})
})
