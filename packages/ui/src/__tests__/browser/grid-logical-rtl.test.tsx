import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { present, renderUI } from '../helpers'

/**
 * The grid chrome in a right-to-left grid. Each edge, margin, and alignment
 * that the recipes name is logical, so it lands on the inline start or end.
 * Only a real browser resolves a logical class to a physical side.
 */
beforeAll(() => page.viewport(1280, 900))

type Sale = { id: number; region: string; units: number }

const sales: Sale[] = [
	{ id: 1, region: 'West', units: 10 },
	{ id: 2, region: 'West', units: 30 },
	{ id: 3, region: 'East', units: 20 },
]

const columns: GridColumn<Sale>[] = [
	{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
	{ id: 'units', title: 'Units', cell: (row) => row.units, value: (row) => row.units },
]

describe('grid group rail in a right-to-left grid (real browser)', () => {
	it('draws the rail at the inline start of the group header cell', () => {
		const { container } = renderUI(
			<div dir="rtl" style={{ width: 600 }}>
				<Grid
					columns={columns}
					rows={sales}
					getKey={(row) => row.id}
					groupBy={{ value: 'region' }}
				/>
			</div>,
		)

		const cell = present(
			container.querySelector<HTMLElement>('tr[data-group-row] > td'),
			'a group header cell',
		)

		const style = getComputedStyle(cell)

		expect(style.borderRightWidth).toBe('2px')

		expect(style.borderLeftWidth).toBe('0px')
	})
})
