import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../components/kanban'
import { allBySlot, getSlot, renderUI } from '../helpers'
import { drag } from './helpers/drag'

/**
 * The handle of a kanban card is the keyboard stop of the card. The card has no
 * role, so a control inside it keeps its own role. The keyboard lifts and moves
 * the card from the handle, and a mouse still drags the card from any part of
 * it.
 *
 * Rides the real browser for real focus, the accessible name that the browser
 * engine computes, and a real pointer drag past the sensor's activation
 * distance.
 */
describe('kanban card handle (real browser)', () => {
	type Item = { id: string; label: string }

	type Column = { id: string; items: Item[] }

	const initial: Column[] = [
		{
			id: 'todo',
			items: [
				{ id: 'a', label: 'Alpha' },
				{ id: 'b', label: 'Bravo' },
			],
		},
	]

	function Board({ onReorder }: { onReorder?: (next: Column[]) => void }) {
		const [columns, setColumns] = useState(initial)

		return (
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={(next) => {
					setColumns(next)

					onReorder?.(next)
				}}
				aria-label="Board"
			>
				{columns.map((column) => (
					<KanbanColumn key={column.id} value={column.id} aria-label="Todo">
						<KanbanColumnBody>
							{column.items.map((item) => (
								<KanbanCard key={item.id} value={item.id}>
									<KanbanCardHandle />
									<span>{item.label}</span>
									<button type="button">Edit {item.label}</button>
								</KanbanCard>
							))}
						</KanbanColumnBody>
					</KanbanColumn>
				))}
			</Kanban>
		)
	}

	it('names the handle from the card, and keeps the inner control a button', async () => {
		renderUI(<Board />)

		await expect.element(page.getByRole('button', { name: 'Drag Alpha Edit Alpha' })).toBeVisible()

		await expect
			.element(page.getByRole('button', { name: 'Edit Alpha', exact: true }))
			.toBeVisible()
	})

	it('lifts, moves, and drops the card from the handle with the keyboard', async () => {
		const onReorder = vi.fn()

		const { container } = renderUI(<Board onReorder={onReorder} />)

		const [handle] = allBySlot(container, 'kanban-card-handle')

		if (!handle) throw new Error('expected a handle')

		handle.focus()

		await userEvent.keyboard(' ')

		await expect
			.poll(() => getSlot(container, 'kanban-card').hasAttribute('data-lifted'))
			.toBe(true)

		await userEvent.keyboard('{ArrowDown}')

		await expect.poll(() => onReorder.mock.calls.length).toBe(1)

		expect(onReorder.mock.calls[0]?.[0][0].items.map((item: Item) => item.id)).toEqual(['b', 'a'])

		await userEvent.keyboard('{Enter}')

		// Focus follows the moved card to its handle.
		await expect.poll(() => document.activeElement?.getAttribute('data-card-id')).toBe('a')

		expect(document.activeElement?.getAttribute('data-slot')).toBe('kanban-card-handle')
	})

	it.each([
		['the card body', 'kanban-card'],
		['the handle', 'kanban-card-handle'],
	])('drags the card with a pointer from %s', async (_name, slot) => {
		const { container } = renderUI(<Board />)

		const [card] = allBySlot(container, 'kanban-card')

		const [target] = allBySlot(container, slot)

		if (!card || !target) throw new Error('expected a card')

		// The body press lands on the text, away from the handle and the button.
		const box = (
			slot === 'kanban-card' ? getSlot(card, 'kanban-card-handle') : target
		).getBoundingClientRect()

		const from =
			slot === 'kanban-card'
				? { x: box.right + 4, y: box.top + box.height / 2 }
				: { x: box.left + box.width / 2, y: box.top + box.height / 2 }

		const held = await drag(target, from, [{ x: from.x, y: from.y + 20 }])

		await expect.poll(() => card.hasAttribute('data-dragging')).toBe(true)

		await held.release()

		await expect.poll(() => card.hasAttribute('data-dragging')).toBe(false)
	})
})
