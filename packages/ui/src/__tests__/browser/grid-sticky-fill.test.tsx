import type { CSSProperties } from 'react'
import { describe, expect, it } from 'vitest'
import { Card } from '../../components/card'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI } from '../helpers'

/**
 * The fill of the sticky grid cells (real paint). The sticky header and the
 * frozen columns must paint the fill of the surface under the grid. A fixed
 * color matched only one surface. A grid in a dashboard tile below `lg` showed
 * a header one shade darker than the tile. jsdom compiles no Tailwind and
 * resolves no custom property, so only a real browser reads the fill back.
 *
 * The suite runs at 414px, below `lg`, which is the width that showed the
 * defect. The suite has no dark mode, so a marker color on an outer element
 * shows which declaration the cells read.
 */
describe('grid sticky fill (real browser)', () => {
	type Row = { id: number; name: string; email: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
		{ id: 'email', title: 'Email', cell: (row) => row.email },
	]

	const rows: Row[] = Array.from({ length: 20 }, (_, i) => ({
		id: i + 1,
		name: `Person ${i + 1}`,
		email: `person${i + 1}@example.com`,
	}))

	/** A color that no recipe paints, set as the fill of an outer element. */
	const MARKER = 'rgb(1, 2, 3)'

	const marked = { '--surface-fill': MARKER } as CSSProperties

	function grid() {
		return (
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				header={{ position: 'sticky' }}
				maxHeight="200px"
			/>
		)
	}

	/** The painted fill of the sticky header bar and of a frozen body cell. */
	function fills(container: HTMLElement) {
		const header = container.querySelector<HTMLElement>('thead th:not([style*="inset-inline"])')

		const pinned = container.querySelector<HTMLElement>('tbody td[style*="inset-inline"]')

		if (!header || !pinned) throw new Error('no sticky header cell or frozen body cell')

		return {
			header: getComputedStyle(header).backgroundColor,
			pinned: getComputedStyle(pinned).backgroundColor,
		}
	}

	it('paints the fill of the surface card that holds the grid', () => {
		const { container } = renderUI(
			<div style={marked}>
				<Card bg="surface">{grid()}</Card>
			</div>,
		)

		const card = container.querySelector<HTMLElement>('[data-slot=card]')

		if (!card) throw new Error('no card')

		const surface = getComputedStyle(card).backgroundColor

		// The nearest surface wins over the outer declaration.
		expect(surface).not.toBe(MARKER)

		expect(fills(container)).toEqual({ header: surface, pinned: surface })
	})

	it('paints an inherited surface fill', () => {
		const { container } = renderUI(<div style={marked}>{grid()}</div>)

		expect(fills(container)).toEqual({ header: MARKER, pinned: MARKER })
	})

	it('falls back to the content host with no surface around the grid', () => {
		const { container } = renderUI(grid())

		// The light content host is white at every width.
		expect(fills(container)).toEqual({ header: 'rgb(255, 255, 255)', pinned: 'rgb(255, 255, 255)' })
	})
})
