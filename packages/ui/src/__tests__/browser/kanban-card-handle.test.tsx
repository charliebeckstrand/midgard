import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../modules/kanban'
import { allBySlot, getSlot, renderUI } from '../helpers'
import { drag } from './helpers/drag'

/**
 * The handle of a kanban card is the keyboard stop of the card. The card has no
 * role, so a control inside it keeps its own role. The keyboard lifts and moves
 * the card from the handle, and a pointer drags the card only from the handle.
 * The card centers the handle at its start edge, and its other children align
 * beside it.
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

	function Board({
		onReorder,
		cardClassName,
	}: {
		onReorder?: (next: Column[]) => void
		cardClassName?: string
	}) {
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
								<KanbanCard key={item.id} value={item.id} className={cardClassName}>
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

	it('shows the lift accent on the focused handle, not on the card', async () => {
		const { container } = renderUI(<Board />)

		const [handle] = allBySlot(container, 'kanban-card-handle')

		if (!handle) throw new Error('expected a handle')

		// A Tab gives the handle `:focus-visible`, as a keyboard user has it.
		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(handle)

		const resting = getComputedStyle(handle).outlineColor

		await userEvent.keyboard(' ')

		await expect
			.poll(() => getSlot(container, 'kanban-card').hasAttribute('data-lifted'))
			.toBe(true)

		// The accent is the color of a probe with the lift outline class.
		const probe = document.createElement('div')

		probe.className = 'outline-violet-600'

		document.body.append(probe)

		const accent = getComputedStyle(probe).outlineColor

		probe.remove()

		expect(accent).not.toBe(resting)

		await expect.poll(() => getComputedStyle(handle).outlineColor).toBe(accent)
	})

	it('drags the card with a pointer from the handle', async () => {
		const { container } = renderUI(<Board />)

		const [card] = allBySlot(container, 'kanban-card')

		if (!card) throw new Error('expected a card')

		const handle = getSlot(card, 'kanban-card-handle')

		const box = handle.getBoundingClientRect()

		const from = { x: box.left + box.width / 2, y: box.top + box.height / 2 }

		const held = await drag(handle, from, [{ x: from.x, y: from.y + 20 }])

		await expect.poll(() => card.hasAttribute('data-dragging')).toBe(true)

		await held.release()

		await expect.poll(() => card.hasAttribute('data-dragging')).toBe(false)
	})

	it('gives the drag overlay the className of the card', async () => {
		const { container } = renderUI(<Board cardClassName="border-red-500" />)

		const [card] = allBySlot(container, 'kanban-card')

		if (!card) throw new Error('expected a card')

		const handle = getSlot(card, 'kanban-card-handle')

		const box = handle.getBoundingClientRect()

		const from = { x: box.left + box.width / 2, y: box.top + box.height / 2 }

		const held = await drag(handle, from, [{ x: from.x, y: from.y + 20 }])

		await expect
			.poll(() => document.querySelector('[data-slot="kanban-card"][data-overlay]'))
			.not.toBeNull()

		const overlay = document.querySelector('[data-slot="kanban-card"][data-overlay]')

		if (!overlay) throw new Error('expected the drag overlay')

		expect(getComputedStyle(overlay).borderTopColor).toBe(getComputedStyle(card).borderTopColor)

		await held.release()
	})

	it('starts no drag from the card body', async () => {
		const { container } = renderUI(<Board />)

		const [card] = allBySlot(container, 'kanban-card')

		if (!card) throw new Error('expected a card')

		// The press lands on the text, away from the handle and the button.
		const text = card.querySelector('span')

		if (!text) throw new Error('expected the card text')

		const box = text.getBoundingClientRect()

		const from = { x: box.left + 2, y: box.top + box.height / 2 }

		const held = await drag(text, from, [
			{ x: from.x, y: from.y + 20 },
			{ x: from.x, y: from.y + 40 },
		])

		expect(card).not.toHaveAttribute('data-dragging')

		expect(document.querySelector('[data-slot="kanban-card"][data-overlay]')).toBeNull()

		await held.release()
	})

	it('centers the handle at the start edge, and aligns the other children with each other', () => {
		const { container } = renderUI(<Board />)

		const [card] = allBySlot(container, 'kanban-card')

		if (!card) throw new Error('expected a card')

		const handle = getSlot(card, 'kanban-card-handle').getBoundingClientRect()

		const text = card.querySelector('span')?.getBoundingClientRect()

		const edit = card.querySelector('button:not([data-slot])')?.getBoundingClientRect()

		if (!text || !edit) throw new Error('expected the card children')

		const box = card.getBoundingClientRect()

		// The handle is centered on the height of the card, and the text sits beside it.
		expect(Math.abs(handle.top + handle.height / 2 - (box.top + box.height / 2))).toBeLessThan(1)

		expect(text.left).toBeGreaterThanOrEqual(handle.right)

		// The control on the next line starts at the left edge of the text.
		expect(edit.top).toBeGreaterThanOrEqual(text.bottom)

		expect(edit.left).toBe(text.left)
	})
})
