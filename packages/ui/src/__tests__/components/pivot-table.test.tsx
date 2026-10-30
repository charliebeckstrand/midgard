import { describe, expect, it } from 'vitest'
import { PivotTable, type PivotTableProps } from '../../components/pivot-table'
import { LocaleProvider } from '../../providers/locale'
import { bySlot, present, renderUI, screen, within } from '../helpers'

type Row = { lane: string; period: string; loads: number }

const data: Row[] = [
	{ lane: 'LAX → DFW', period: 'Jan', loads: 12 },
	{ lane: 'LAX → DFW', period: 'Jan', loads: 3 },
	{ lane: 'LAX → DFW', period: 'Feb', loads: 9 },
	{ lane: 'ORD → ATL', period: 'Jan', loads: 4 },
	{ lane: 'ORD → ATL', period: 'Feb', loads: 11 },
]

/** The data `<tr>` whose header cell renders `label`. */
const getRow = (label: string) => present(screen.getByText(label).closest('tr'), `row "${label}"`)

/** Renders the loads of each lane by month. A case changes only the props that it tests. */
function renderPivot(props: Partial<PivotTableProps<Row>> = {}) {
	return renderUI(
		<PivotTable
			rows={data}
			keys={{ row: 'lane', column: 'period', value: 'loads' }}
			rowHeader="Lane"
			{...props}
		/>,
	)
}

describe('PivotTable', () => {
	it('renders a table with row and column dimensions', () => {
		const { container } = renderPivot()

		expect(bySlot(container, 'table')).toBeInTheDocument()

		expect(bySlot(container, 'pivot-table')).toBeInTheDocument()

		expect(screen.getByRole('columnheader', { name: 'Lane' })).toBeInTheDocument()

		expect(screen.getByRole('columnheader', { name: 'Jan' })).toBeInTheDocument()

		expect(screen.getByRole('columnheader', { name: 'Feb' })).toBeInTheDocument()
	})

	it('renders the corner as a <td> when no rowHeader is given', () => {
		const { container } = renderPivot({ rowHeader: undefined })

		const corner = present(container.querySelector('thead tr')?.firstElementChild, 'corner cell')

		// An empty `<th>` is a header with no text (axe empty-table-header).
		expect(corner.tagName).toBe('TD')

		expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Jan', 'Feb'])
	})

	it('names the table from the optional aria-label', () => {
		renderPivot({ 'aria-label': 'Loads by lane and month' })

		expect(screen.getByRole('table', { name: 'Loads by lane and month' })).toBeInTheDocument()
	})

	it('exposes each row-dimension label as a row header', () => {
		renderPivot()

		expect(screen.getByRole('rowheader', { name: 'LAX → DFW' })).toBeInTheDocument()

		expect(screen.getByRole('rowheader', { name: 'ORD → ATL' })).toBeInTheDocument()
	})

	it('sums values in each cell', () => {
		renderPivot()

		const laxRow = getRow('LAX → DFW')

		const ordRow = getRow('ORD → ATL')

		expect(within(laxRow).getByText('15')).toBeInTheDocument()

		expect(within(laxRow).getByText('9')).toBeInTheDocument()

		expect(within(ordRow).getByText('4')).toBeInTheDocument()

		expect(within(ordRow).getByText('11')).toBeInTheDocument()
	})

	it('renders row totals when totals="row"', () => {
		renderPivot({ totals: 'row' })

		const laxRow = getRow('LAX → DFW')

		const ordRow = getRow('ORD → ATL')

		expect(within(laxRow).getByText('24')).toBeInTheDocument()

		expect(within(ordRow).getByText('15')).toBeInTheDocument()
	})

	it('renders column totals and grand total when totals="both"', () => {
		renderPivot({ totals: 'both' })

		const totalCells = screen.getAllByText('Total')

		const totalRow = present(
			totalCells.find((el) => el.getAttribute('scope') === 'row')?.closest('tr'),
			'totals row',
		)

		expect(within(totalRow).getByText('19')).toBeInTheDocument()

		expect(within(totalRow).getByText('20')).toBeInTheDocument()

		expect(within(totalRow).getByText('39')).toBeInTheDocument()

		// A totals row is a summary, so it is in the foot, not with the data rows.
		expect(totalRow.parentElement?.tagName).toBe('TFOOT')
	})

	it('aggregates by count', () => {
		renderPivot({ aggregation: 'count' })

		const laxRow = getRow('LAX → DFW')

		expect(within(laxRow).getByText('2')).toBeInTheDocument()
	})

	it('renders the empty cell placeholder for missing groups', () => {
		const sparse: Row[] = [
			{ lane: 'A', period: 'Jan', loads: 1 },
			{ lane: 'B', period: 'Feb', loads: 2 },
		]

		renderPivot({ rows: sparse })

		const emptyCells = screen.getAllByText('—')

		expect(emptyCells).toHaveLength(2)
	})

	it('uses custom format', () => {
		renderPivot({ format: (v) => `${v} loads` })

		expect(screen.getByText('15 loads')).toBeInTheDocument()
	})

	it('respects explicit rowOrder and columnOrder', () => {
		renderPivot({ rowOrder: ['ORD → ATL', 'LAX → DFW'], columnOrder: ['Feb', 'Jan'] })

		const headers = screen.getAllByRole('columnheader')

		expect(headers[1]?.textContent).toBe('Feb')

		expect(headers[2]?.textContent).toBe('Jan')

		const rows = screen.getAllByRole('row')

		expect(rows[1]?.textContent?.startsWith('ORD → ATL')).toBe(true)

		expect(rows[2]?.textContent?.startsWith('LAX → DFW')).toBe(true)
	})
})

describe('PivotTable in a locale', () => {
	it('names the totals in the language of the locale', () => {
		renderUI(
			<LocaleProvider locale="es-ES" catalogs={{ es: { 'ui.pivotTable.total': 'Suma' } }}>
				<PivotTable
					rows={data}
					keys={{ row: 'lane', column: 'period', value: 'loads' }}
					rowHeader="Ruta"
					totals="both"
				/>
			</LocaleProvider>,
		)

		expect(screen.getByRole('columnheader', { name: 'Suma' })).toBeInTheDocument()

		expect(screen.getByRole('rowheader', { name: 'Suma' })).toBeInTheDocument()
	})
})
