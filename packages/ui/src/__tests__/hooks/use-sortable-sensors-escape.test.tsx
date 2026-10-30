import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import { useEscapeLayer } from '../../hooks/use-escape-layer'
import { renderUI } from '../helpers'
import { it } from '../helpers/fake-clock'
import { lift, SortableHarness } from '../helpers/sortable-harness'

/**
 * A drag inside a dismissable surface, such as a dialog. Each sensor of dnd-kit
 * cancels its drag on Escape. The surface must not close on that press.
 */
function Harness({ onDismiss, onDragCancel }: { onDismiss: () => void; onDragCancel: () => void }) {
	useEscapeLayer({ open: true, onDismiss })

	return <SortableHarness ids={['a', 'b']} onDragCancel={onDragCancel} />
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

	it('cancels a pointer drag on Escape and keeps the surface open', async ({ clock }) => {
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

		// The pointer sensor removes its document listeners 50 ms after the cancel.
		await clock.advance(50)
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
