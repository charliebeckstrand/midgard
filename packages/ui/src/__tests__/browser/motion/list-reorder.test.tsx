import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { List, ListItem } from '../../../components/list'
import { allBySlot, frames, getSlot, renderUI } from '../../helpers'
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

		const path = Array.from({ length: 12 }, (_, index) => ({
			x: from.x,
			y: from.y + ((index + 1) * step * 1.3) / 12,
		}))

		return drag(handle, from, path)
	}

	it('drags a row past the next one and reports the order once, on the drop', async () => {
		const onReorder = vi.fn()

		const { container } = renderUI(
			<List items={items} getKey={(item) => item.id} onReorder={onReorder}>
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
			<List items={items} getKey={(item) => item.id} onReorder={onReorder}>
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
			<List items={items} getKey={(item) => item.id} onReorder={() => {}}>
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
				<List items={items} getKey={(item) => item.id} onReorder={() => {}} variant={variant}>
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
				<List items={items} getKey={(item) => item.id} onReorder={() => {}}>
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

	// The box of the list bounds the drag, so a row never goes over the content
	// around the list.
	it('holds a dragged row inside the list, past either end', async () => {
		const { container } = renderUI(
			<div style={{ paddingTop: 200, paddingBottom: 200 }}>
				<List items={items} getKey={(item) => item.id} onReorder={() => {}}>
					{(item) => <ListItem>{item.label}</ListItem>}
				</List>
			</div>,
		)

		const list = getSlot(container, 'list')

		const [first, , last] = allBySlot(list, 'list-item')

		if (!first || !last) throw new Error('expected rows')

		const bounds = list.getBoundingClientRect()

		const travel = async (row: HTMLElement, by: number) => {
			const box = getSlot(row, 'list-handle').getBoundingClientRect()

			const x = box.left + box.width / 2

			const y = box.top + box.height / 2

			const path = Array.from({ length: 12 }, (_, index) => ({ x, y: y + ((index + 1) * by) / 12 }))

			return drag(getSlot(row, 'list-handle'), { x, y }, path)
		}

		const up = await travel(first, -150)

		await expect.poll(() => first.hasAttribute('data-dragging')).toBe(true)

		await frames()

		expect(first.getBoundingClientRect().top).toBeGreaterThanOrEqual(bounds.top - 0.5)

		await up.release()

		await expect.poll(() => first.hasAttribute('data-dragging')).toBe(false)

		const down = await travel(last, 150)

		await expect.poll(() => last.hasAttribute('data-dragging')).toBe(true)

		await frames()

		expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(bounds.bottom + 0.5)

		await down.release()
	})

	// A drag moves a horizontal row along the inline axis only, so a row on a
	// wrapped line was out of its reach. The row stays on one line in a rail, and
	// the rail scrolls while the dragged row is near its edge.
	it('drags a horizontal row past every other row inside a narrow parent', async () => {
		const columns = ['Todo', 'In progress', 'Review', 'Done', 'Blocked', 'Archived'].map(
			(label) => ({ id: label, label }),
		)

		const onReorder = vi.fn()

		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<List
					items={columns}
					getKey={(item) => item.id}
					onReorder={onReorder}
					orientation="horizontal"
				>
					{(item) => <ListItem>{item.label}</ListItem>}
				</List>
			</div>,
		)

		const list = getSlot(container, 'list')

		const rows = allBySlot(list, 'list-item')

		expect(new Set(rows.map((row) => row.getBoundingClientRect().top)).size).toBe(1)

		const [first] = rows

		if (!first) throw new Error('expected rows')

		const handle = getSlot(first, 'list-handle')

		const box = handle.getBoundingClientRect()

		const from = { x: box.left + box.width / 2, y: box.top + box.height / 2 }

		const end = getSlot(container, 'list-rail').getBoundingClientRect().right - 10

		// The pointer travels to the end of the rail, then holds there with a small
		// motion toward the edge while the rail scrolls.
		const path = [
			...Array.from({ length: 20 }, (_, index) => ({
				x: from.x + ((end - from.x) * (index + 1)) / 20,
				y: from.y,
			})),
			...Array.from({ length: 80 }, (_, index) => ({ x: end + (index % 2), y: from.y })),
		]

		const held = await drag(handle, from, path)

		await expect
			.poll(() => allBySlot(list, 'list-item').map((row) => row.dataset.itemId))
			.toEqual(['In progress', 'Review', 'Done', 'Blocked', 'Archived', 'Todo'])

		await held.release()

		await expect.poll(() => onReorder.mock.calls.length).toBe(1)

		expect(onReorder.mock.calls[0]?.[0].map((item: Item) => item.id)).toEqual([
			'In progress',
			'Review',
			'Done',
			'Blocked',
			'Archived',
			'Todo',
		])
	})

	// A keyboard move keeps the focus on the row, so the browser did not scroll
	// the row into view, and a move past the edge of the rail hid the row.
	it('keeps a horizontal row in view in the rail while the keyboard moves it', async () => {
		const columns = ['Todo', 'In progress', 'Review', 'Done', 'Blocked', 'Archived'].map(
			(label) => ({ id: label, label }),
		)

		function Columns() {
			const [order, setOrder] = useState(columns)

			return (
				<div style={{ width: 300 }}>
					<List
						items={order}
						getKey={(item) => item.id}
						onReorder={setOrder}
						orientation="horizontal"
					>
						{(item) => <ListItem>{item.label}</ListItem>}
					</List>
				</div>
			)
		}

		const { container } = renderUI(<Columns />)

		const rail = getSlot(container, 'list-rail')

		const [first] = allBySlot(rail, 'list-item')

		if (!first) throw new Error('expected rows')

		// In view once the move comes to its end. Until then, a transform keeps
		// the row at its old place, which is in view.
		const settledInView = () => {
			if (getComputedStyle(first).transform !== 'none') return false

			const row = first.getBoundingClientRect()

			const box = rail.getBoundingClientRect()

			return row.left >= box.left - 1 && row.right <= box.right + 1
		}

		first.focus()

		await expect.poll(() => document.activeElement).toBe(first)

		await userEvent.keyboard(' ')

		await expect.poll(() => first.hasAttribute('data-lifted')).toBe(true)

		for (let step = 0; step < columns.length - 1; step++) {
			await userEvent.keyboard('{ArrowRight}')

			await expect.poll(settledInView).toBe(true)
		}

		expect(allBySlot(rail, 'list-item').at(-1)).toBe(first)

		expect(rail.scrollLeft).toBeGreaterThan(0)

		await userEvent.keyboard('{Escape}')
	})
})
