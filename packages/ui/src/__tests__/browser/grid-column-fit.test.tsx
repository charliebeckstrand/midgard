import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, waitFor } from '../helpers'

/**
 * Column auto-fit against a real layout engine. The fit reads the container's
 * `clientWidth` and writes column sizing, neither of which jsdom provides (it
 * paints no layout, so `clientWidth` is 0 and the fit stands down). Here the grid
 * renders inside a known-width frame, so the resolved column widths and the
 * table's overflow can be measured.
 */
describe('grid column auto-fit (real browser)', () => {
	type Row = { id: number; name: string; age: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, width: '200px', minWidth: 80 },
		{ id: 'age', title: 'Age', cell: (row) => row.age, width: '120px' },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', age: 30 },
		{ id: 2, name: 'Bob', age: 25 },
	]

	const getKey = (row: Row) => row.id

	function setup(frameWidth: number) {
		const { container } = renderUI(
			<div style={{ width: `${frameWidth}px` }}>
				<Grid columns={columns} rows={rows} getKey={getKey} />
			</div>,
		)

		const table = container.querySelector('table') as HTMLElement

		const header = (col: string) =>
			container.querySelector<HTMLElement>(`th[data-grid-col="${col}"]`) as HTMLElement

		const scroll = container.querySelector<HTMLElement>('[data-slot="table"]') as HTMLElement

		return { container, table, header, scroll }
	}

	it('honors specified widths and overflows when they exceed the container', async () => {
		// 200 + 120 = 320 of declared width in a 240px frame: too wide to fit.
		const { table, header, scroll } = setup(240)

		await waitFor(() => {
			// Each column holds its declared width rather than squishing to fit…
			expect(header('name').getBoundingClientRect().width).toBeCloseTo(200, 0)

			expect(header('age').getBoundingClientRect().width).toBeCloseTo(120, 0)
		})

		// …so the table runs wider than its scroll container and overflows sideways
		// (no shrink-to-fit, so no truncation).
		expect(table.getBoundingClientRect().width).toBeCloseTo(320, 0)

		expect(table.getBoundingClientRect().width).toBeGreaterThan(scroll.clientWidth)
	})

	it('grows columns to fill surplus space, never below the declared width', async () => {
		// 320 of declared width in a 640px frame: room to spare.
		const { table, header, scroll } = setup(640)

		await waitFor(() => {
			// Columns grow past their declared widths to take up the surplus…
			expect(header('name').getBoundingClientRect().width).toBeGreaterThan(200)

			expect(header('age').getBoundingClientRect().width).toBeGreaterThan(120)
		})

		// …filling the container instead of overflowing it.
		expect(table.getBoundingClientRect().width).toBeLessThanOrEqual(scroll.clientWidth + 1)

		expect(table.getBoundingClientRect().width).toBeGreaterThan(440)
	})

	it('fills the container without overflowing when cells carry outline borders', async () => {
		// Hairline `outline` borders render the table a pixel or two past its summed
		// column widths. Growing the columns to the full container width would push
		// that border chrome past the scroll edge, raising a phantom horizontal
		// scrollbar; the fit reserves the chrome so the bordered table lands on the
		// container exactly.
		const { container } = renderUI(
			<div style={{ width: '640px' }}>
				<Grid outline columns={columns} rows={rows} getKey={getKey} />
			</div>,
		)

		const table = container.querySelector('table') as HTMLElement

		const scroll = container.querySelector<HTMLElement>('[data-slot="table"]') as HTMLElement

		await waitFor(() => expect(table.style.width).not.toBe(''))

		// No horizontal scrollbar: the table (borders and all) fits its container.
		expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth)
	})
})
