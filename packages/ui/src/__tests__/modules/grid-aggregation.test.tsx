import { describe, expect, it } from 'vitest'
import { Grid } from '../../modules/grid'
import {
	aggregateColumn,
	aggregateLabelSpan,
	formatAggregate,
	hasAggregation,
} from '../../modules/grid/grid-aggregate'
import type { GridColumn } from '../../modules/grid/types'
import { renderUI, screen, userEvent, within } from '../helpers'

type Sale = { id: number; region: string; units: number; revenue: number; margin: number }

const sales: Sale[] = [
	{ id: 1, region: 'West', units: 10, revenue: 100, margin: 40 },
	{ id: 2, region: 'West', units: 30, revenue: 300, margin: 90 },
	{ id: 3, region: 'East', units: 20, revenue: 260, margin: 65 },
	{ id: 4, region: 'East', units: 40, revenue: 540, margin: 130 },
]

const columns: GridColumn<Sale>[] = [
	{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
	{
		id: 'units',
		title: 'Units',
		cell: (row) => String(row.units),
		value: (row) => row.units,
		aggFunc: 'sum',
	},
	{
		id: 'revenue',
		title: 'Revenue',
		cell: (row) => `$${row.revenue}`,
		value: (row) => row.revenue,
		aggFunc: 'sum',
		aggCell: ({ value }) => `$${value}`,
	},
	{
		// A weighted ratio across two fields — the custom form needs row access,
		// not one column's values.
		id: 'perUnit',
		title: '$/unit',
		cell: (row) => (row.revenue / row.units).toFixed(2),
		aggFunc: (rows: Sale[]) => {
			const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)

			const units = rows.reduce((sum, row) => sum + row.units, 0)

			return units === 0 ? '' : `$${(revenue / units).toFixed(2)}`
		},
	},
]

const getKey = (row: Sale) => row.id

function rowByText(text: string): HTMLElement | null {
	return screen.getByText(text).closest('tr')
}

describe('grid aggregation core', () => {
	it('reduces the built-in functions over a column, skipping non-numeric entries', () => {
		const rows = [{ n: 10 }, { n: 20 }, { n: 'x' }, { n: 30 }]

		const col = (name: SumName): GridColumn<{ n: unknown }> => ({
			id: 'n',
			value: (row) => row.n,
			aggFunc: name,
		})

		type SumName = 'sum' | 'avg' | 'min' | 'max' | 'count'

		expect(aggregateColumn(col('sum'), rows)).toBe(60)

		expect(aggregateColumn(col('avg'), rows)).toBe(20)

		expect(aggregateColumn(col('min'), rows)).toBe(10)

		expect(aggregateColumn(col('max'), rows)).toBe(30)

		// count counts rows, not parseable values.
		expect(aggregateColumn(col('count'), rows)).toBe(4)
	})

	it('yields null for an all-non-numeric set rather than a fabricated zero', () => {
		const col: GridColumn<{ n: unknown }> = { id: 'n', value: (row) => row.n, aggFunc: 'sum' }

		expect(aggregateColumn(col, [{ n: 'a' }, { n: null }])).toBeNull()

		expect(formatAggregate(null)).toBe('')
	})

	it('hands the rows themselves to a custom function', () => {
		const col: GridColumn<Sale> = {
			id: 'perUnit',
			aggFunc: (rows) => rows.length * 2,
		}

		expect(aggregateColumn(col, sales)).toBe(8)
	})

	it('detects aggregation and places the label span before the first aggregated column', () => {
		expect(hasAggregation(columns)).toBe(true)

		expect(hasAggregation([{ id: 'region' }])).toBe(false)

		// region (index 0) has no aggFunc, units (index 1) does → label spans the 1 leading column.
		expect(aggregateLabelSpan(columns)).toBe(1)

		// A leading aggregated column still leaves one cell for the label.
		expect(aggregateLabelSpan([{ id: 'a', aggFunc: 'sum' }, { id: 'b' }])).toBe(1)
	})
})

describe('Grid aggregation rendering', () => {
	it('renders aggregates on each group header through the column formatter', () => {
		renderUI(<Grid columns={columns} rows={sales} getKey={getKey} groupBy={{ value: 'region' }} />)

		const west = rowByText('West (2)')

		expect(west).not.toBeNull()

		// West units 10+30=40, revenue $100+$300=$400 via aggCell, $/unit 400/40=$10.00.
		expect(west?.textContent).toContain('40')

		expect(west?.textContent).toContain('$400')

		expect(west?.textContent).toContain('$10.00')

		const east = rowByText('East (2)')

		// East revenue $260+$540=$800, units 60, $/unit 800/60=$13.33.
		expect(east?.textContent).toContain('$800')

		expect(east?.textContent).toContain('$13.33')
	})

	it('appends a per-group total row under each group when groupTotalRow is set', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={sales}
				getKey={getKey}
				groupBy={{ value: 'region' }}
				groupTotalRow="bottom"
			/>,
		)

		const totals = container.querySelectorAll('[data-total-row="group"]')

		expect(totals).toHaveLength(2)

		// Each carries its group's figures beside a "Total" label.
		expect([...totals].some((row) => row.textContent?.includes('Total'))).toBe(true)

		expect([...totals].some((row) => row.textContent?.includes('40'))).toBe(true)
	})

	it('appends one grand-total row over the whole set, grouped or flat', () => {
		const grouped = renderUI(
			<Grid
				columns={columns}
				rows={sales}
				getKey={getKey}
				groupBy={{ value: 'region' }}
				grandTotalRow="bottom"
			/>,
		)

		const grandGrouped = grouped.container.querySelector('[data-total-row="grand"]')

		// Every row: units 100, revenue $1200 (via aggCell), $/unit 1200/100 = $12.00.
		expect(grandGrouped?.textContent).toContain('100')

		expect(grandGrouped?.textContent).toContain('$1200')

		expect(grandGrouped?.textContent).toContain('$12.00')

		const flat = renderUI(
			<Grid columns={columns} rows={sales} getKey={getKey} grandTotalRow="bottom" />,
		)

		// Works with no grouping too.
		expect(flat.container.querySelector('[data-total-row="grand"]')?.textContent).toContain('$1200')
	})

	it('renders no total rows without an aggregating column', () => {
		const plain: GridColumn<Sale>[] = [
			{ id: 'region', cell: (row) => row.region, value: (row) => row.region },
			{ id: 'units', cell: (row) => String(row.units), value: (row) => row.units },
		]

		const { container } = renderUI(
			<Grid
				columns={plain}
				rows={sales}
				getKey={getKey}
				groupBy={{ value: 'region' }}
				groupTotalRow="bottom"
				grandTotalRow="bottom"
			/>,
		)

		expect(container.querySelector('[data-total-row]')).toBeNull()
	})

	it('collapses a group total with its group', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={sales}
				getKey={getKey}
				groupBy={{ value: 'region' }}
				groupTotalRow="bottom"
			/>,
		)

		const groupTotal = () =>
			container.querySelector('[data-total-row="group"]') as HTMLElement | null

		expect(groupTotal()).not.toHaveAttribute('aria-hidden')

		await user.click(screen.getByRole('button', { name: 'Collapse group West' }))

		// The West total collapses out of the accessibility tree with its leaves.
		const westTotal = within(rowByText('West (2)')?.parentElement as HTMLElement)

		expect(westTotal).toBeDefined()

		// The first group total (West) is now hidden.
		expect(container.querySelector('[data-total-row="group"]')).toHaveAttribute(
			'aria-hidden',
			'true',
		)
	})
})
