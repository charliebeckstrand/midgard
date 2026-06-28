import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, waitFor } from '../helpers'

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

	// Leftmost visible ink x (client px) of the affordance svg in a header. The
	// svg box can be flush to the cell padding while the drawn glyph sits inset,
	// so measure the glyph's user-space bbox mapped through the screen CTM.
	function inkLeft(container: HTMLElement, columnId: string): number {
		const svg = container.querySelector<SVGGraphicsElement>(
			`th[data-grid-col="${columnId}"] svg`,
		) as SVGGraphicsElement

		const bbox = svg.getBBox()

		const ctm = svg.getScreenCTM()

		if (!ctm) return svg.getBoundingClientRect().left

		const point = (svg.ownerSVGElement ?? (svg as unknown as SVGSVGElement)).createSVGPoint()

		point.x = bbox.x

		point.y = bbox.y

		return point.matrixTransform(ctm).x
	}

	function valueLeft(container: HTMLElement, columnId: string): number {
		const span = container.querySelector<HTMLElement>(
			`td[data-grid-col="${columnId}"] span`,
		) as HTMLElement

		return span.getBoundingClientRect().left
	}

	it('aligns the reorder grip with the column cell values', async () => {
		const { container } = renderUI(
			<div style={{ width: '640px' }}>
				<Grid
					reorder
					columns={columns}
					rows={people}
					getKey={(row) => row.id}
					columnOrder={{ defaultValue: ['name', 'email'] }}
				/>
			</div>,
		)

		await waitFor(() => expect(container.querySelector('td[data-grid-col="name"]')).not.toBeNull())

		// The grip's drawn dots land within a glyph-edge hairline of where the value
		// text starts — not the cell-padding-sized step the un-nudged box would show.
		expect(Math.abs(inkLeft(container, 'name') - valueLeft(container, 'name'))).toBeLessThanOrEqual(
			1.5,
		)

		expect(
			Math.abs(inkLeft(container, 'email') - valueLeft(container, 'email')),
		).toBeLessThanOrEqual(1.5)
	})

	it('aligns a pinned column pin button with the column cell values', async () => {
		const pinned: GridColumn<Person>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
			{ id: 'email', title: 'Email', cell: (row) => row.email },
		]

		const { container } = renderUI(
			<div style={{ width: '640px' }}>
				<Grid columns={pinned} rows={people} getKey={(row) => row.id} />
			</div>,
		)

		await waitFor(() => expect(container.querySelector('td[data-grid-col="name"]')).not.toBeNull())

		expect(Math.abs(inkLeft(container, 'name') - valueLeft(container, 'name'))).toBeLessThanOrEqual(
			1.5,
		)
	})
})
