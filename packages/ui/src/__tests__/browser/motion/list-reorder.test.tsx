import { describe, expect, it, vi } from 'vitest'
import { List, ListItem } from '../../../components/list'
import { allBySlot, getSlot, renderUI } from '../../helpers'
import { drag } from '../helpers/drag'

/**
 * The pointer drag of a reorderable List over Motion's `Reorder`. Rides the real
 * browser and the real Motion, because the claim needs a real pointer drag and
 * real layout measures.
 */
describe('List pointer reorder (real browser)', () => {
	type Item = { id: string; label: string }

	const items: Item[] = [
		{ id: 'a', label: 'Alpha' },
		{ id: 'b', label: 'Bravo' },
		{ id: 'c', label: 'Charlie' },
	]

	/** Presses the grip of `row` and moves the pointer down past the next row. */
	const dragDown = async (row: HTMLElement, next: HTMLElement) => {
		const handle = getSlot(row, 'list-handle')

		const box = handle.getBoundingClientRect()

		const from = { x: box.left + box.width / 2, y: box.top + box.height / 2 }

		const step = next.getBoundingClientRect().height

		const path = Array.from({ length: 12 }, (_, i) => ({
			x: from.x,
			y: from.y + ((i + 1) * step * 1.3) / 12,
		}))

		return drag(handle, from, path)
	}

	it('drags a row past the next one and reports the order once, on the drop', async () => {
		const onReorder = vi.fn()

		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id} onReorder={onReorder}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const list = getSlot(container, 'list')

		const [first, second] = allBySlot(list, 'list-item')

		if (!first || !second) throw new Error('expected rows')

		const held = await dragDown(first, second)

		await expect.poll(() => first.hasAttribute('data-dragging')).toBe(true)

		await expect
			.poll(() => allBySlot(list, 'list-item').map((row) => row.dataset.itemId))
			.toEqual(['b', 'a', 'c'])

		expect(onReorder).not.toHaveBeenCalled()

		await held.release()

		await expect.poll(() => onReorder.mock.calls.length).toBe(1)

		expect(onReorder.mock.calls[0]?.[0].map((item: Item) => item.id)).toEqual(['b', 'a', 'c'])

		expect(first.getAttribute('aria-describedby')).toBeTruthy()
	})
	it('puts the rows back and reports nothing when Escape cancels the drag', async () => {
		const onReorder = vi.fn()

		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id} onReorder={onReorder}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const list = getSlot(container, 'list')

		const [first, second] = allBySlot(list, 'list-item')

		if (!first || !second) throw new Error('expected rows')

		const held = await dragDown(first, second)

		await expect
			.poll(() => allBySlot(list, 'list-item').map((row) => row.dataset.itemId))
			.toEqual(['b', 'a', 'c'])

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

		await expect
			.poll(() => allBySlot(list, 'list-item').map((row) => row.dataset.itemId))
			.toEqual(['a', 'b', 'c'])

		await expect.poll(() => first.hasAttribute('data-dragging')).toBe(false)

		await held.release()

		expect(onReorder).not.toHaveBeenCalled()
	})
	it('marks the dragged row and its handle with data-dragging, and sets no aria-pressed', async () => {
		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id} onReorder={() => {}}>
				{(item) => <ListItem href={`#${item.id}`}>{item.label}</ListItem>}
			</List>,
		)

		const list = getSlot(container, 'list')

		const [first, second] = allBySlot(list, 'list-item')

		if (!first || !second) throw new Error('expected rows')

		const held = await dragDown(first, second)

		await expect.poll(() => first.hasAttribute('data-dragging')).toBe(true)

		expect(getSlot(first, 'list-handle')).toHaveAttribute('data-dragging')

		expect(second).not.toHaveAttribute('data-dragging')

		expect(document.querySelector('[aria-pressed]')).toBeNull()

		await held.release()

		await expect.poll(() => first.hasAttribute('data-dragging')).toBe(false)
	})

	// A drag moves the row and changes nothing else about how it looks, in every
	// variant. Before, the dragged row took an opaque fill that covered the row
	// under it.
	it.each(['separated', 'outline', 'plain', 'solid', 'bare'] as const)(
		'keeps the classes and the fill of a dragged %s row',
		async (variant) => {
			const { container } = renderUI(
				<List items={items} getKey={(i) => i.id} onReorder={() => {}} variant={variant}>
					{(item) => <ListItem>{item.label}</ListItem>}
				</List>,
			)

			const [first, second] = allBySlot(getSlot(container, 'list'), 'list-item')

			if (!first || !second) throw new Error('expected rows')

			const rest = { className: first.className, fill: getComputedStyle(first).backgroundColor }

			const held = await dragDown(first, second)

			await expect.poll(() => first.hasAttribute('data-dragging')).toBe(true)

			expect(first.className).toBe(rest.className)

			expect(getComputedStyle(first).backgroundColor).toBe(rest.fill)

			await held.release()
		},
	)

	// A glass panel is the containing block of a fixed descendant. The dragged row
	// moves itself by a transform, not through a fixed picture, so it stays under
	// the pointer inside such a panel.
	it('keeps the dragged row under the pointer inside a glass panel', async () => {
		const { container } = renderUI(
			<div style={{ backdropFilter: 'blur(4px)', transform: 'translateY(40px)', paddingTop: 200 }}>
				<List items={items} getKey={(i) => i.id} onReorder={() => {}}>
					{(item) => <ListItem>{item.label}</ListItem>}
				</List>
			</div>,
		)

		const [first] = allBySlot(getSlot(container, 'list'), 'list-item')

		if (!first) throw new Error('expected rows')

		const grip = getSlot(first, 'list-handle')

		const start = first.getBoundingClientRect()

		const box = grip.getBoundingClientRect()

		const x = box.left + box.width / 2

		const y = box.top + box.height / 2

		const held = await drag(grip, { x, y }, [
			{ x, y: y + 4 },
			{ x, y: y + 8 },
			{ x, y: y + 12 },
		])

		await expect.poll(() => first.getBoundingClientRect().top).toBeCloseTo(start.top + 12, 0)

		expect(first.getBoundingClientRect().left).toBeCloseTo(start.left, 0)

		await held.release()
	})
})
