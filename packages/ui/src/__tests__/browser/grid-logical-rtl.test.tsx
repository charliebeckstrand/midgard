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

describe('grid toolbar and footer layout in a right-to-left grid (real browser)', () => {
	const rows: Sale[] = Array.from({ length: 30 }, (_, i) => ({
		id: i + 1,
		region: i % 2 ? 'West' : 'East',
		units: i,
	}))

	/** The distance from the inline end of `box` to the inline end of `row`: the physical left. */
	const fromEnd = (box: HTMLElement, row: HTMLElement) =>
		box.getBoundingClientRect().left - row.getBoundingClientRect().left

	it('pushes the toolbar content to the inline end', () => {
		const { getByText } = renderUI(
			<div dir="rtl" style={{ width: 900 }}>
				<Grid columns={columns} rows={rows} getKey={(row) => row.id} toolbar={<span>Extra</span>} />
			</div>,
		)

		const content = present(getByText('Extra').parentElement, 'the toolbar content')

		const bar = present(content.parentElement, 'the toolbar row')

		expect(Math.abs(fromEnd(content, bar))).toBeLessThanOrEqual(1)
	})

	it('pushes the table tools to the inline end', () => {
		const { getByRole } = renderUI(
			<div dir="rtl" style={{ width: 900 }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					columnManager={{ toolbar: true }}
				/>
			</div>,
		)

		const tools = getByRole('toolbar', { name: 'Table tools' })

		const bar = present(tools.parentElement, 'the toolbar row')

		expect(Math.abs(fromEnd(tools, bar))).toBeLessThanOrEqual(1)
	})

	it('pushes the footer content to the inline end', () => {
		const { getByText } = renderUI(
			<div dir="rtl" style={{ width: 900 }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					footer={{ rowTotal: true, content: () => <span>Extra</span> }}
				/>
			</div>,
		)

		const trailing = present(getByText('Extra').parentElement, 'the footer content')

		const bar = present(trailing.parentElement, 'the footer bar')

		expect(Math.abs(fromEnd(trailing, bar))).toBeLessThanOrEqual(1)
	})

	it('aligns the page status to the inline end', () => {
		const { getAllByRole } = renderUI(
			<div dir="rtl" style={{ width: 1100 }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
				/>
			</div>,
		)

		// The page status names the row range, such as "1–5 of 30".
		const status = present(
			getAllByRole('status').find((element) => / of 30/.test(element.textContent ?? '')),
			'the page status',
		)

		expect(getComputedStyle(status).textAlign).toBe('end')
	})
})
