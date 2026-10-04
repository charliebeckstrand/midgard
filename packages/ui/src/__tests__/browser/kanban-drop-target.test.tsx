import { describe, expect, it } from 'vitest'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../components/kanban'
import { allBySlot, renderUI } from '../helpers'
import { drag, type Point } from './helpers/drag'

/**
 * Kanban drop target (real paint). A column takes `data-over` while a dragged
 * card is over the column itself, as over an empty column, and its fill steps
 * up one rung. Over a column that holds cards, the card under the pointer is the
 * target, and the live move shows the drop. jsdom compiles no Tailwind and lays
 * nothing out for the pointer sensor, so only a real browser reads the fill.
 */
describe('Kanban drop target (real browser)', () => {
	type Item = { id: string; label: string }

	type Column = { id: string; items: Item[] }

	/** The center of `el`, in client space. */
	const centerOf = (el: HTMLElement): Point => {
		const box = el.getBoundingClientRect()

		return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
	}

	function board(columns: Column[]) {
		const { container } = renderUI(
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={() => {}}
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
			</Kanban>,
		)

		const [source, target] = allBySlot(container, 'kanban-column')

		const [card] = allBySlot(container, 'kanban-card')

		if (!source || !target || !card) throw new Error('expected two columns and a card')

		return { source, target, card }
	}

	it('steps up the fill of an empty column while a card is over it', async () => {
		const { source, target, card } = board([
			{ id: 'todo', items: [{ id: 'a', label: 'Alpha' }] },
			{ id: 'done', items: [] },
		])

		const resting = getComputedStyle(target).backgroundColor

		const from = centerOf(card)

		const held = await drag(card, from, [{ x: from.x, y: from.y + 20 }, centerOf(target)])

		await expect.poll(() => target.hasAttribute('data-over')).toBe(true)

		expect(getComputedStyle(target).backgroundColor).not.toBe(resting)

		expect(source).not.toHaveAttribute('data-over')

		await held.release()

		await expect.poll(() => target.hasAttribute('data-over')).toBe(false)

		expect(getComputedStyle(target).backgroundColor).toBe(resting)
	})
})
