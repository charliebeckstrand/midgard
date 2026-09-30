import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { present, renderUI, waitFor } from '../../helpers'

/**
 * Leading header-affordance alignment against a real layout engine. The reorder
 * grip and the pin button precede the column title, but their visible glyph must
 * sit over the column's cell values — not a step to their right. Lucide glyphs
 * are optically inset within their box, so a box flush to the cell padding still
 * reads misaligned; the recipe pulls each affordance left by that inset. The gap
 * between glyph ink and the value only resolves in a browser, where `getBBox`
 * and the screen CTM give the glyph's true on-screen position.
 */
describe('grid header affordance alignment (real browser)', () => {
	type Person = { id: number; name: string; email: string }

	const people: Person[] = [
		{ id: 1, name: 'Wade Cooper', email: 'wade@example.com' },
		{ id: 2, name: 'Arlene McCoy', email: 'arlene@example.com' },
	]

	const columns: GridColumn<Person>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'email', title: 'Email', cell: (row) => row.email },
	]

	type Dir = 'ltr' | 'rtl'

	// The leading visible ink x (client px) of the affordance svg in a header: the
	// left edge in LTR, and the right edge in RTL, where the glyph leads from the
	// right. The svg box can be flush to the cell padding while the drawn glyph
	// sits inset, so measure the glyph's user-space bbox mapped through the screen CTM.
	function ink(container: HTMLElement, columnId: string, dir: Dir): number {
		const svg = present<SVGGraphicsElement>(
			container.querySelector(`th[data-grid-col="${columnId}"] svg`),
			'the header glyph',
		)

		const bbox = svg.getBBox()

		const ctm = svg.getScreenCTM()

		if (!ctm) return svg.getBoundingClientRect()[dir === 'ltr' ? 'left' : 'right']

		const point = (svg.ownerSVGElement ?? (svg as unknown as SVGSVGElement)).createSVGPoint()

		point.x = dir === 'ltr' ? bbox.x : bbox.x + bbox.width

		point.y = bbox.y

		return point.matrixTransform(ctm).x
	}

	/** The leading edge of the cell value: its left in LTR, and its right in RTL. */
	function value(container: HTMLElement, columnId: string, dir: Dir): number {
		const span = present(
			container.querySelector(`td[data-grid-col="${columnId}"] span`),
			'the cell value',
		)

		return span.getBoundingClientRect()[dir === 'ltr' ? 'left' : 'right']
	}

	const gap = (container: HTMLElement, columnId: string, dir: Dir) =>
		Math.abs(ink(container, columnId, dir) - value(container, columnId, dir))

	// In a right-to-left grid the affordance leads from the right, so its pull is
	// toward the inline start. The glyph's right ink then meets the right edge of
	// the value.
	it.each(['ltr', 'rtl'] as const)(
		'aligns the reorder grip with the column cell values (%s)',
		async (dir) => {
			const { container } = renderUI(
				<div dir={dir} style={{ width: '640px' }}>
					<Grid
						reorder
						columns={columns}
						rows={people}
						getKey={(row) => row.id}
						columnOrder={{ defaultValue: ['name', 'email'] }}
					/>
				</div>,
			)

			await waitFor(() =>
				expect(container.querySelector('td[data-grid-col="name"]')).not.toBeNull(),
			)

			// The grip's drawn dots land within a glyph-edge hairline of where the value
			// text starts — not the cell-padding-sized step the un-nudged box would show.
			for (const id of ['name', 'email']) {
				expect(gap(container, id, dir)).toBeLessThanOrEqual(1.5)
			}
		},
	)

	it.each(['ltr', 'rtl'] as const)(
		'aligns a pinned column pin button with the column cell values (%s)',
		async (dir) => {
			const pinned: GridColumn<Person>[] = [
				{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
				{ id: 'email', title: 'Email', cell: (row) => row.email },
			]

			const { container } = renderUI(
				<div dir={dir} style={{ width: '640px' }}>
					<Grid columns={pinned} rows={people} getKey={(row) => row.id} />
				</div>,
			)

			await waitFor(() =>
				expect(container.querySelector('td[data-grid-col="name"]')).not.toBeNull(),
			)

			expect(gap(container, 'name', dir)).toBeLessThanOrEqual(1.5)
		},
	)
})
