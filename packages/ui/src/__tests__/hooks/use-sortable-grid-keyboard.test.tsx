import { type RefObject, useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useSortableGridKeyboard } from '../../hooks/use-sortable-grid-keyboard'
import { expectAnnouncement, fireEvent, renderUI, screen } from '../helpers'

type Item = { id: string; label: string }

const ITEMS: Item[] = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Bravo' },
	{ id: 'c', label: 'Charlie' },
	{ id: 'd', label: 'Delta' },
	{ id: 'e', label: 'Echo' },
	{ id: 'f', label: 'Foxtrot' },
]

/**
 * A grid of six over two columns.
 *
 * The columns are declared inline because that is what the hook reads to size a vertical step:
 * jsdom lays nothing out, but it does resolve an inline `grid-template-columns` verbatim, so two
 * declared tracks are two columns here exactly as in a browser.
 */
function Grid() {
	const [items, setItems] = useState(ITEMS)

	const ref = useRef<HTMLUListElement>(null)

	const { liftedId, onItemKeyDown, onItemBlur } = useSortableGridKeyboard({
		items,
		getKey: (item) => item.id,
		onReorder: setItems,
		containerRef: ref as RefObject<HTMLElement | null>,
		itemSlot: 'card',
	})

	return (
		<ul ref={ref} style={{ gridTemplateColumns: '100px 100px' }}>
			{items.map((item) => (
				<li
					key={item.id}
					data-slot="card"
					data-item-id={item.id}
					data-lifted={liftedId === item.id ? '' : undefined}
					aria-label={item.label}
					// biome-ignore lint/a11y/noNoninteractiveTabindex: a sortable item IS a keyboard stop — that is the lift model under test, and how ListItem renders too
					tabIndex={0}
					onKeyDown={(event) => onItemKeyDown(item.id, event)}
					onBlur={onItemBlur}
				>
					{item.label}
				</li>
			))}
		</ul>
	)
}

const order = () =>
	[...document.querySelectorAll('[data-slot="card"]')].map((node) =>
		node.getAttribute('data-item-id'),
	)

const card = (label: string) => screen.getByRole('listitem', { name: label })

/** Presses a key on `label`'s card the way a keyboard user would — on the focused element. */
function press(label: string, key: string) {
	const element = card(label)

	element.focus()

	fireEvent.keyDown(element, { key })
}

describe('useSortableGridKeyboard', () => {
	it('walks focus across and down the grid without moving anything', () => {
		renderUI(<Grid />)

		press('Alpha', 'ArrowRight')

		expect(document.activeElement).toBe(card('Bravo'))

		press('Bravo', 'ArrowDown')

		// Two columns, so Down from the second card lands on the fourth — a row, not a position.
		expect(document.activeElement).toBe(card('Delta'))

		expect(order()).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
	})

	it('moves a lifted card one position across and one row down', async () => {
		renderUI(<Grid />)

		press('Alpha', ' ')

		expect(card('Alpha')).toHaveAttribute('data-lifted')

		await expectAnnouncement('Picked up Alpha, position 1 of 6', 'assertive')

		press('Alpha', 'ArrowRight')

		expect(order()).toEqual(['b', 'a', 'c', 'd', 'e', 'f'])

		press('Alpha', 'ArrowDown')

		// From index 1, a two-column row down is index 3.
		expect(order()).toEqual(['b', 'c', 'd', 'a', 'e', 'f'])

		await expectAnnouncement('Alpha moved to position 4 of 6.', 'assertive')
	})

	it('clamps a row-sized move at the end instead of dropping it', () => {
		renderUI(<Grid />)

		press('Delta', ' ')
		press('Delta', 'ArrowDown')

		// Index 3 plus a row is 5 — the last position, which it takes rather than refusing to move.
		expect(order()).toEqual(['a', 'b', 'c', 'e', 'f', 'd'])

		press('Delta', 'ArrowDown')

		// Already last: nothing to clamp to, so nothing happens.
		expect(order()).toEqual(['a', 'b', 'c', 'e', 'f', 'd'])
	})

	it('drops the card on Enter, after which arrows navigate again', async () => {
		renderUI(<Grid />)

		press('Alpha', ' ')
		press('Alpha', 'Enter')

		expect(card('Alpha')).not.toHaveAttribute('data-lifted')

		await expectAnnouncement(/Dropped Alpha/, 'assertive')

		press('Alpha', 'ArrowRight')

		expect(order()).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
		expect(document.activeElement).toBe(card('Bravo'))
	})

	it('leaves modified arrows to the browser', () => {
		renderUI(<Grid />)

		press('Alpha', ' ')

		const element = card('Alpha')

		element.focus()

		fireEvent.keyDown(element, { key: 'ArrowRight', shiftKey: true })

		expect(order()).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
	})
})
