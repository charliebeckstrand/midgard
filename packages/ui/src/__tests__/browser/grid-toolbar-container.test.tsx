import type { CSSProperties } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { getSlot, renderUI } from '../helpers'

/**
 * The top row of the grid toolbar follows the width of the grid, not the
 * viewport, as the grid footer does.
 *
 * The row read the viewport (`sm:`). A grid in a narrow box on a wide screen,
 * such as a dashboard tile or a sheet, then put the search field and the tools
 * in one cramped row. A grid in a wide box on a narrow screen stacked them.
 *
 * Rides the real browser because the claim is a layout one: jsdom has no
 * layout.
 */
describe('the grid toolbar row (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	function directionIn(style: CSSProperties): string {
		const { container } = renderUI(
			<div style={style}>
				<Grid
					columns={columns}
					rows={[{ id: 1, name: 'Alice' }]}
					getKey={(row) => row.id}
					search={{ placeholder: 'Find' }}
					toolbar={<button type="button">Region</button>}
				/>
			</div>,
		)

		const bar = getSlot(container, 'grid-toolbar').firstElementChild as HTMLElement

		return getComputedStyle(bar).flexDirection
	}

	it('stacks in a narrow grid', () => {
		expect(directionIn({ width: 320 })).toBe('column')
	})

	it('lays out a row in a wide grid', () => {
		expect(directionIn({ width: 900 })).toBe('row')
	})
})
