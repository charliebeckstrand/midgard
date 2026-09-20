import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { List, ListItem, ListLabel } from '../../components/list'
import { bySlot, renderUI } from '../helpers'

/**
 * An interactive row answers the pointer everywhere it is painted (WCAG 2.5.8,
 * Target Size). The content column is only `flex-1`, so the row's padding, its
 * gaps, and the slot chrome sat outside the target: a press two pixels inside the
 * card did nothing, while the same press one pixel further in opened the row. A
 * pointer-capturing `::after` on the content area closes that gap.
 *
 * Rides the real browser because the claim is a hit-testing one. The overlay is a
 * pseudo-element, and jsdom loads no stylesheet and runs no layout — there it can
 * report neither the box nor the element under a point.
 */
describe('list item hit area (real browser)', () => {
	type Item = { id: string; label: string }

	const items: Item[] = [
		{ id: 'a', label: 'Alpha' },
		{ id: 'b', label: 'Bravo' },
	]

	/** The element the browser reports under a point, as a row-relative offset. */
	const at = (el: HTMLElement, dx: number, dy: number) => {
		const box = el.getBoundingClientRect()

		return document.elementFromPoint(box.left + dx, box.top + dy)
	}

	it('presses the row’s handler from the padding', async () => {
		const onClick = vi.fn()

		// One item, so no handle renders and the left padding is the row's own.
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => (
					<ListItem as="button" onClick={onClick}>
						<ListLabel>{item.label}</ListLabel>
					</ListItem>
				)}
			</List>,
		)

		const row = bySlot(container, 'list-item') as HTMLElement

		const content = bySlot(container, 'list-item-content') as HTMLElement

		// 5px in from the row's top-left corner: inside the 1px border and the 12px
		// padding, and well clear of the content column.
		expect(content.getBoundingClientRect().left).toBeGreaterThan(
			row.getBoundingClientRect().left + 5,
		)

		expect(at(row, 5, 5)).toBe(content)

		await userEvent.click(row, { position: { x: 5, y: 5 } })

		expect(onClick).toHaveBeenCalledTimes(1)
	})

	it('leaves an inert row’s padding inert', async () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => (
					<ListItem>
						<ListLabel>{item.label}</ListLabel>
					</ListItem>
				)}
			</List>,
		)

		const row = bySlot(container, 'list-item') as HTMLElement

		// No handler to serve, so the padding stays the row's own — a row that grew
		// a target it does not paint would read as clickable and act on nothing.
		expect(at(row, 5, 5)).toBe(row)
	})

	it('keeps the drag handle over the overlay', async () => {
		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id} onReorder={() => {}}>
				{(item) => (
					<ListItem href={`/${item.id}`}>
						<ListLabel>{item.label}</ListLabel>
					</ListItem>
				)}
			</List>,
		)

		const row = bySlot(container, 'list-item') as HTMLElement

		const handle = bySlot(container, 'list-handle') as HTMLElement

		const box = handle.getBoundingClientRect()

		const point = document.elementFromPoint(
			box.left + box.width / 2,
			box.top + box.height / 2,
		) as Node

		expect(handle.contains(point)).toBe(true)

		// The padding above the handle still belongs to the row's own target.
		expect(at(row, box.left - row.getBoundingClientRect().left + box.width / 2, 3)).not.toBe(handle)
	})

	it('keeps a suffix control over the overlay', async () => {
		const onClick = vi.fn()
		const onSuffixClick = vi.fn()

		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => (
					<ListItem
						as="button"
						onClick={onClick}
						suffix={
							<button type="button" onClick={onSuffixClick}>
								Remove
							</button>
						}
					>
						<ListLabel>{item.label}</ListLabel>
					</ListItem>
				)}
			</List>,
		)

		const suffix = container.querySelector('button[type="button"]:not([data-slot])') as HTMLElement

		await userEvent.click(suffix)

		expect(onSuffixClick).toHaveBeenCalledTimes(1)

		// A trailing control is a sibling of the content area, so it never delivers
		// the row's own press as well.
		expect(onClick).not.toHaveBeenCalled()
	})
})
