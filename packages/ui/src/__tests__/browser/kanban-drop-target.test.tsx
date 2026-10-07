import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../components/kanban'
import { renderUI } from '../helpers'
import { drag, type Point } from './helpers/drag'

/**
 * Kanban drop target (real paint). A column takes `data-over` while a dragged
 * card from another column is in it, after the live move on drag-over. Its fill
 * then steps up one rung. The column that the drag started in stays quiet. jsdom compiles no Tailwind and
 * lays nothing out for the pointer sensor, so only a real browser reads the fill.
 */
describe('Kanban drop target (real browser)', () => {
	type Item = { id: string; label: string }

	type Column = { id: string; items: Item[] }

	/** The center of `el`, in client space. */
	const centerOf = (el: Element): Point => {
		const box = el.getBoundingClientRect()

		return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
	}

	/** A board that takes each reorder, as an app does, so a live move lands. */
	function Board({ initial }: { initial: Column[] }) {
		const [columns, setColumns] = useState(initial)

		return (
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={setColumns}
				aria-label="Board"
			>
				{columns.map((column) => (
					<KanbanColumn key={column.id} value={column.id} aria-label={column.id}>
						<KanbanColumnBody>
							{column.items.map((item) => (
								<KanbanCard key={item.id} value={item.id}>
									<KanbanCardHandle />
									{item.label}
								</KanbanCard>
							))}
						</KanbanColumnBody>
					</KanbanColumn>
				))}
			</Kanban>
		)
	}

	function board(initial: Column[]) {
		const { container } = renderUI(<Board initial={initial} />)

		const column = (id: string) => {
			const el = container.querySelector<HTMLElement>(`[data-column-id="${id}"]`)

			if (!el) throw new Error(`expected the column ${id}`)

			return el
		}

		const card = (id: string) => {
			const el = container.querySelector<HTMLElement>(`[data-card-id="${id}"]`)

			if (!el) throw new Error(`expected the card ${id}`)

			return el
		}

		// The handle is the only drag surface of a card.
		const handle = (id: string) => {
			const el = card(id).querySelector<HTMLElement>('[data-slot="kanban-card-handle"]')

			if (!el) throw new Error(`expected the handle of the card ${id}`)

			return el
		}

		return { column, card, handle }
	}

	it('steps up the fill of an empty column while a card is over it', async () => {
		const { column, handle } = board([
			{ id: 'todo', items: [{ id: 'a', label: 'Alpha' }] },
			{ id: 'done', items: [] },
		])

		const target = column('done')

		const resting = getComputedStyle(target).backgroundColor

		const from = centerOf(handle('a'))

		const held = await drag(handle('a'), from, [{ x: from.x, y: from.y + 20 }, centerOf(target)])

		await expect.poll(() => target.hasAttribute('data-over')).toBe(true)

		expect(getComputedStyle(target).backgroundColor).not.toBe(resting)

		expect(column('todo')).not.toHaveAttribute('data-over')

		await held.release()

		await expect.poll(() => target.hasAttribute('data-over')).toBe(false)

		expect(getComputedStyle(target).backgroundColor).toBe(resting)
	})

	it('steps up the fill of a column that holds cards once the card moves into it', async () => {
		const { column, card, handle } = board([
			{ id: 'todo', items: [{ id: 'a', label: 'Alpha' }] },
			{ id: 'done', items: [{ id: 'b', label: 'Bravo' }] },
		])

		const target = column('done')

		const resting = getComputedStyle(target).backgroundColor

		const from = centerOf(handle('a'))

		const held = await drag(handle('a'), from, [{ x: from.x, y: from.y + 20 }, centerOf(card('b'))])

		await expect.poll(() => target.hasAttribute('data-over')).toBe(true)

		expect(getComputedStyle(target).backgroundColor).not.toBe(resting)

		expect(column('todo')).not.toHaveAttribute('data-over')

		await held.release()

		await expect.poll(() => target.hasAttribute('data-over')).toBe(false)
	})

	it('keeps the column that the drag started in quiet', async () => {
		const { column, card, handle } = board([
			{
				id: 'todo',
				items: [
					{ id: 'a', label: 'Alpha' },
					{ id: 'c', label: 'Charlie' },
				],
			},
			{ id: 'done', items: [{ id: 'b', label: 'Bravo' }] },
		])

		const source = column('todo')

		const from = centerOf(handle('a'))

		// The lift, and a reorder in place over the card below it.
		const held = await drag(handle('a'), from, [{ x: from.x, y: from.y + 20 }, centerOf(card('c'))])

		await expect.poll(() => card('a').hasAttribute('data-dragging')).toBe(true)

		expect(source).not.toHaveAttribute('data-over')

		await held.release()

		expect(source).not.toHaveAttribute('data-over')
	})
})
