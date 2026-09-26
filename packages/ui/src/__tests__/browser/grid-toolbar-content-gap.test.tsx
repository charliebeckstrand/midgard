import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'

/**
 * The consumer content and the table tools of a Grid toolbar sit together at the end of the row.
 *
 * From `sm` the content and the tools each had `ms-auto`. Two auto margins in one row share the
 * free space, so a gap as wide as half the free space opened between the two clusters. Only the
 * first of the two clusters now takes the auto margin.
 *
 * Rides the real browser because the claim is a computed layout: jsdom loads no stylesheet.
 */
describe('the Grid toolbar with consumer content and tools (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	beforeAll(() => page.viewport(960, 640))

	afterAll(() => page.viewport(414, 896))

	it('keeps the tools beside the content at the end of the row', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={[{ id: 1, name: 'Alice' }]}
				getKey={(row) => row.id}
				search={{ placeholder: 'Find' }}
				columnManager={{ toolbar: true }}
				toolbar={<button type="button">Region</button>}
			/>,
		)

		const content = screen.getByRole('button', { name: 'Region' }).getBoundingClientRect()

		const tools = screen.getByRole('toolbar', { name: 'Table tools' }).getBoundingClientRect()

		// The bar's own gap (`gap-2`), and no share of the free space.
		expect(tools.left - content.right).toBe(8)
	})
})
