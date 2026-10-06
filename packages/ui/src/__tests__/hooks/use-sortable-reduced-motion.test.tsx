import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSortableItem } from '../../hooks/use-sortable-item'
import { useSortableSensors } from '../../hooks/use-sortable-sensors'
import { renderUI, stubMatchMedia } from '../helpers'

/**
 * Under reduced motion, the sortable reflow must not carry the default
 * dnd-kit inline `transition: transform 200ms ease`. An inline style beats a
 * `motion-reduce:` class, so the hook must drop it itself.
 */
function Item({ id }: { id: string }) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style } = useSortableItem({ id })

	return (
		<div ref={setNodeRef} data-testid={id} style={style}>
			<button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners}>
				{id}
			</button>
		</div>
	)
}

function Harness() {
	const sensors = useSortableSensors()

	return (
		<DndContext sensors={sensors}>
			<SortableContext items={['a', 'b', 'c']}>
				<Item id="a" />
				<Item id="b" />
				<Item id="c" />
			</SortableContext>
		</DndContext>
	)
}

describe('useSortableItem under reduced motion', () => {
	it('gives the displaced items no transition', async () => {
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		renderUI(<Harness />)

		const grip = screen.getByRole('button', { name: 'a' })

		grip.focus()

		await act(async () => {
			fireEvent.keyDown(grip, { code: 'Space', key: ' ' })
		})

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20))
		})

		await act(async () => {
			fireEvent.keyDown(grip, { code: 'ArrowDown', key: 'ArrowDown' })
		})

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20))
		})

		const transition = screen.getByTestId('b').style.transition

		await act(async () => {
			fireEvent.keyDown(grip, { code: 'Escape', key: 'Escape' })
		})

		expect(transition).toBe('')
	})
})
