import { describe, expect, it } from 'vitest'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../components/kanban'
import { ListItem, ListSortable } from '../../components/list'
import { allBySlot, getSlot, renderUI } from '../helpers'
import { drag } from './helpers/drag'

/**
 * A kanban card and a list item show a live drag with one attribute,
 * `data-dragging`. The `hannou.grab` cursor closes the hand on it. The package
 * keeps `data-active` for the roved or highlighted item, so a drag must not set
 * it.
 *
 * Rides the real browser because the claim needs a real pointer drag. The
 * sortable sensor starts a drag only after the pointer moves past its
 * activation distance.
 */
describe('drag state attribute (real browser)', () => {
	type Item = { id: string; label: string }

	const items: Item[] = [
		{ id: 'a', label: 'Alpha' },
		{ id: 'b', label: 'Bravo' },
	]

	/** Presses the center of `el` and moves past the sensor's activation distance. */
	const startDrag = (el: HTMLElement) => {
		const box = el.getBoundingClientRect()

		const from = { x: box.left + box.width / 2, y: box.top + box.height / 2 }

		return drag(el, from, [{ x: from.x, y: from.y + 20 }])
	}

	it('keeps the kanban overlay clone out of the accessibility tree and the tab order', async () => {
		const { container } = renderUI(
			<Kanban
				columns={[{ id: 'todo', items }]}
				getKey={(item: Item) => item.id}
				onReorder={() => {}}
				aria-label="Board"
			>
				<KanbanColumn value="todo" aria-label="Todo">
					<KanbanColumnBody>
						{items.map((item) => (
							<KanbanCard key={item.id} value={item.id}>
								<KanbanCardHandle />
								{item.label}
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		const [card] = allBySlot(container, 'kanban-card')

		if (!card) throw new Error('expected a kanban card')

		const held = await startDrag(getSlot(card, 'kanban-card-handle'))

		await expect.poll(() => card.hasAttribute('data-dragging')).toBe(true)

		const overlay = document.querySelector<HTMLElement>('[data-slot="kanban-card"][data-overlay]')

		expect(overlay?.inert).toBe(true)

		await held.release()
	})

	it('marks the dragged kanban card and its overlay with data-dragging only', async () => {
		const { container } = renderUI(
			<Kanban
				columns={[{ id: 'todo', items }]}
				getKey={(item: Item) => item.id}
				onReorder={() => {}}
				aria-label="Board"
			>
				<KanbanColumn value="todo" aria-label="Todo">
					<KanbanColumnBody>
						{items.map((item) => (
							<KanbanCard key={item.id} value={item.id}>
								<KanbanCardHandle />
								{item.label}
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		const [card, other] = allBySlot(container, 'kanban-card')

		if (!card || !other) throw new Error('expected two kanban cards')

		expect(card).not.toHaveAttribute('data-dragging')

		const held = await startDrag(getSlot(card, 'kanban-card-handle'))

		await expect.poll(() => card.hasAttribute('data-dragging')).toBe(true)

		const overlay = document.querySelector('[data-slot="kanban-card"][data-overlay]')

		expect(overlay).toHaveAttribute('data-dragging')

		for (const el of [card, overlay, other]) expect(el).not.toHaveAttribute('data-active')

		expect(other).not.toHaveAttribute('data-dragging')

		await held.release()

		await expect.poll(() => card.hasAttribute('data-dragging')).toBe(false)
	})

	it('marks the dragged list item and its handle with data-dragging only', async () => {
		const { container } = renderUI(
			<ListSortable items={items} getKey={(i) => i.id} onReorder={() => {}}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</ListSortable>,
		)

		const list = getSlot(container, 'list')

		const [row, other] = allBySlot(list, 'list-item')

		if (!row || !other) throw new Error('expected two list items')

		const handle = getSlot(row, 'list-handle')

		expect(row).not.toHaveAttribute('data-dragging')

		const held = await startDrag(handle)

		await expect.poll(() => row.hasAttribute('data-dragging')).toBe(true)

		expect(handle).toHaveAttribute('data-dragging')

		// The overlay clone renders outside the list, through the same item.
		const overlay = allBySlot(document.body, 'list-item').find((el) => !list.contains(el))

		expect(overlay).toHaveAttribute('data-dragging')

		for (const el of [row, overlay, other]) expect(el).not.toHaveAttribute('data-active')

		expect(other).not.toHaveAttribute('data-dragging')

		await held.release()

		await expect.poll(() => row.hasAttribute('data-dragging')).toBe(false)
	})
})
