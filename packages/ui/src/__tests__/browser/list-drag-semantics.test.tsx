import { describe, expect, it } from 'vitest'
import { ListItem, ListSortable } from '../../components/list'
import { allBySlot, getSlot, present, renderUI } from '../helpers'
import { drag } from './helpers/drag'

/**
 * The semantics of a reorderable list during a pointer drag. The dragged row
 * is a list item, not a toggle button, so it takes no `aria-pressed`. The drag
 * overlay is a picture of the row: a list holds its item, and the picture takes
 * no focus and stays out of the accessibility tree.
 *
 * Rides the real browser because the claim needs a real pointer drag. The
 * sortable sensor starts a drag only after the pointer moves past its
 * activation distance.
 */
describe('List drag semantics (real browser)', () => {
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

	it.each([
		['a row with no handler', undefined],
		['a row whose content is a link', '#alpha'],
	])('sets no aria-pressed on %s while it drags', async (_name, href) => {
		const { container } = renderUI(
			<ListSortable items={items} getKey={(i) => i.id} onReorder={() => {}}>
				{(item) => <ListItem href={href}>{item.label}</ListItem>}
			</ListSortable>,
		)

		const list = getSlot(container, 'list')

		const [row] = allBySlot(list, 'list-item')

		if (!row) throw new Error('expected a list item')

		const held = await startDrag(getSlot(row, 'list-handle'))

		await expect.poll(() => row.hasAttribute('data-dragging')).toBe(true)

		expect(document.querySelector('[aria-pressed]')).toBeNull()

		await held.release()
	})

	it('holds the overlay row in a list, out of focus and the accessibility tree', async () => {
		const { container } = renderUI(
			<ListSortable items={items} getKey={(i) => i.id} onReorder={() => {}}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</ListSortable>,
		)

		const list = getSlot(container, 'list')

		const [row] = allBySlot(list, 'list-item')

		if (!row) throw new Error('expected a list item')

		const held = await startDrag(getSlot(row, 'list-handle'))

		await expect
			.poll(() => allBySlot(document.body, 'list-item').some((el) => !list.contains(el)))
			.toBe(true)

		const overlay = present(
			allBySlot(document.body, 'list-item').find((el) => !list.contains(el)),
			'the overlay row',
		)

		expect(overlay.parentElement?.tagName).toBe('UL')

		expect(overlay.closest('[inert]')).not.toBeNull()

		overlay.focus()

		expect(document.activeElement).not.toBe(overlay)

		await held.release()
	})
})
