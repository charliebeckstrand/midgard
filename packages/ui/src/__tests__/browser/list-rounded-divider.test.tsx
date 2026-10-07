import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { List, ListItem, ListSortable } from '../../components/list'
import { allBySlot, noop, renderUI } from '../helpers'

/**
 * Rounded dividers (real paint). The `plain` and `outline` variants draw each
 * divider as the bottom border of a row (`divide-y`). A rounded row bends that
 * line up at both ends. A `rounded` row must keep square corners and paint its
 * wash on a rounded `::before` layer. jsdom compiles no Tailwind and resolves
 * no pseudo-element, so only a real browser can read the radius and the wash.
 */
describe('List rounded dividers (real browser)', () => {
	type Item = { id: string; label: string }

	const items: Item[] = [
		{ id: 'a', label: 'Alpha' },
		{ id: 'b', label: 'Bravo' },
	]

	/** `hannou.tint` — the wash a row takes on a plain surface. */
	const TINT = 0.05

	/** Alpha of a painted color, or 0 for a transparent one. */
	function alphaOf(painted: string): number {
		if (painted === 'transparent' || painted === 'rgba(0, 0, 0, 0)') return 0

		const alpha = painted.match(/\/\s*([\d.]+)\s*\)$/)

		if (!alpha) throw new Error(`color carries no alpha: ${painted}`)

		return Number(alpha[1])
	}

	/** The four corner radii of an element or one of its pseudo-elements. */
	function radiiOf(element: Element, pseudo?: '::before'): string[] {
		const style = getComputedStyle(element, pseudo)

		return [
			style.borderTopLeftRadius,
			style.borderTopRightRadius,
			style.borderBottomRightRadius,
			style.borderBottomLeftRadius,
		]
	}

	/** The first row of a rounded, interactive list: the one a divider closes. */
	function dividedRow(variant: 'plain' | 'outline'): HTMLElement {
		const { container } = renderUI(
			<List items={items} variant={variant} getKey={(i) => i.id}>
				{(item) => (
					<ListItem rounded as="button" onClick={noop}>
						{item.label}
					</ListItem>
				)}
			</List>,
		)

		const [row] = allBySlot(container, 'list-item')

		if (!row) throw new Error('expected a list item')

		return row
	}

	it.each(['plain', 'outline'] as const)(
		'keeps the %s divider straight and rounds only the wash layer',
		(variant) => {
			const row = dividedRow(variant)

			expect(getComputedStyle(row).borderBottomWidth).toBe('1px')

			// A square row draws its bottom border as a straight line, end to end.
			expect(radiiOf(row)).toEqual(['0px', '0px', '0px', '0px'])

			expect(radiiOf(row, '::before')).toEqual(['8px', '8px', '8px', '8px'])
		},
	)

	it.each(['plain', 'outline'] as const)(
		'paints the %s hover wash on the layer, not the row',
		async (variant) => {
			const row = dividedRow(variant)

			expect(alphaOf(getComputedStyle(row, '::before').backgroundColor)).toBe(0)

			await userEvent.hover(row)

			expect(alphaOf(getComputedStyle(row, '::before').backgroundColor)).toBeCloseTo(TINT, 3)

			expect(alphaOf(getComputedStyle(row).backgroundColor)).toBe(0)
		},
	)

	it('paints the focus wash on the layer of a row that holds the Tab stop', () => {
		// A reorderable row with no handler of its own takes focus on the `<li>`.
		const { container } = renderUI(
			<ListSortable items={items} variant="plain" getKey={(i) => i.id} onReorder={noop}>
				{(item) => (
					<ListItem rounded interactive>
						{item.label}
					</ListItem>
				)}
			</ListSortable>,
		)

		const [, row] = allBySlot(container, 'list-item')

		if (!row) throw new Error('expected a second list item')

		row.focus()

		expect(document.activeElement).toBe(row)

		expect(alphaOf(getComputedStyle(row, '::before').backgroundColor)).toBeCloseTo(TINT, 3)

		expect(radiiOf(row)).toEqual(['0px', '0px', '0px', '0px'])
	})
})
