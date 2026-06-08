import { describe, expect, it } from 'vitest'
import { PivotTable } from '../../components/pivot-table'
import { bySlot, renderUI, screen, within } from '../helpers'

type Row = { lane: string; period: string; loads: number }

const data: Row[] = [
	{ lane: 'LAX → DFW', period: 'Jan', loads: 12 },
	{ lane: 'LAX → DFW', period: 'Jan', loads: 3 },
	{ lane: 'LAX → DFW', period: 'Feb', loads: 9 },
	{ lane: 'ORD → ATL', period: 'Jan', loads: 4 },
	{ lane: 'ORD → ATL', period: 'Feb', loads: 11 },
]

describe('PivotTable', () => {
	it('renders a table with row and column dimensions', () => {
		const { container } = renderUI(
			<PivotTable
				rows={data}
				keys={{ row: 'lane', column: 'period', value: 'loads' }}
				rowHeader="Lane"
			/>,
		)

		expect(bySlot(container, 'table')).toBeInTheDocument()

		expect(bySlot(container, 'pivot-table')).toBeInTheDocument()

		expect(screen.getByRole('columnheader', { name: 'Lane' })).toBeInTheDocument()

		expect(screen.getByRole('columnheader', { name: 'Jan' })).toBeInTheDocument()

		expect(screen.getByRole('columnheader', { name: 'Feb' })).toBeInTheDocument()
	})

	it('names the table from the optional aria-label', () => {
		renderUI(
			<PivotTable
				rows={data}
				keys={{ row: 'lane', column: 'period', value: 'loads' }}
				rowHeader="Lane"
				aria-label="Loads by lane and month"
			/>,
		)

		expect(screen.getByRole('table', { name: 'Loads by lane and month' })).toBeInTheDocument()
	})

	it('exposes each row-dimension label as a row header', () => {
		renderUI(
			<PivotTable
				rows={data}
				keys={{ row: 'lane', column: 'period', value: 'loads' }}
				rowHeader="Lane"
			/>,
		)

		expect(screen.getByRole('rowheader', { name: 'LAX → DFW' })).toBeInTheDocument()

		expect(screen.getByRole('rowheader', { name: 'ORD → ATL' })).toBeInTheDocument()
	})

	it('sums values in each cell', () => {
		renderUI(
			<PivotTable
				rows={data}
				keys={{ row: 'lane', column: 'period', value: 'loads' }}
				rowHeader="Lane"
			/>,
		)

		const laxRow = screen.getByText('LAX → DFW').closest('tr')

		const ordRow = screen.getByText('ORD → ATL').closest('tr')

		expect(laxRow).not.toBeNull()
		expect(ordRow).not.toBeNull()

		if (!laxRow || !ordRow) return

		expect(within(laxRow).getByText('15')).toBeInTheDocument()

		expect(within(laxRow).getByText('9')).toBeInTheDocument()

		expect(within(ordRow).getByText('4')).toBeInTheDocument()

		expect(within(ordRow).getByText('11')).toBeInTheDocument()
	})

	it('renders row totals when totals="row"', () => {
		renderUI(
			<PivotTable
				rows={data}
				keys={{ row: 'lane', column: 'period', value: 'loads' }}
				rowHeader="Lane"
				totals="row"
			/>,
		)

		const laxRow = screen.getByText('LAX → DFW').closest('tr')

		const ordRow = screen.getByText('ORD → ATL').closest('tr')

		if (!laxRow || !ordRow) return

		expect(within(laxRow).getByText('24')).toBeInTheDocument()

		expect(within(ordRow).getByText('15')).toBeInTheDocument()
	})

	it('renders column totals and grand total when totals="both"', () => {
		renderUI(
			<PivotTable
				rows={data}
				keys={{ row: 'lane', column: 'period', value: 'loads' }}
				rowHeader="Lane"
				totals="both"
			/>,
		)

		const totalCells = screen.getAllByText('Total')

		const totalRow = totalCells.find((el) => el.getAttribute('scope') === 'row')?.closest('tr')

		// The totals row label is a <th scope="row">; fail loudly if it's missing
		// rather than silently skipping the assertions below.
		expect(totalRow).toBeTruthy()

		if (!totalRow) return

		expect(within(totalRow).getByText('19')).toBeInTheDocument()

		expect(within(totalRow).getByText('20')).toBeInTheDocument()

		expect(within(totalRow).getByText('39')).toBeInTheDocument()
	})

	it('aggregates by count', () => {
		renderUI(
			<PivotTable
				rows={data}
				keys={{ row: 'lane', column: 'period', value: 'loads' }}
				aggregation="count"
				rowHeader="Lane"
			/>,
		)

		const laxRow = screen.getByText('LAX → DFW').closest('tr')

		if (!laxRow) return

		expect(within(laxRow).getByText('2')).toBeInTheDocument()
	})

	it('renders the empty cell placeholder for missing groups', () => {
		const sparse: Row[] = [
			{ lane: 'A', period: 'Jan', loads: 1 },
			{ lane: 'B', period: 'Feb', loads: 2 },
		]

		renderUI(
			<PivotTable
				rows={sparse}
				keys={{ row: 'lane', column: 'period', value: 'loads' }}
				rowHeader="Lane"
			/>,
		)

		const emptyCells = screen.getAllByText('—')

		expect(emptyCells).toHaveLength(2)
	})

	it('uses custom format', () => {
		renderUI(
			<PivotTable
				rows={data}
				keys={{ row: 'lane', column: 'period', value: 'loads' }}
				format={(v) => `${v} loads`}
				rowHeader="Lane"
			/>,
		)

		expect(screen.getByText('15 loads')).toBeInTheDocument()
	})

	it('respects explicit rowOrder and columnOrder', () => {
		renderUI(
			<PivotTable
				rows={data}
				keys={{ row: 'lane', column: 'period', value: 'loads' }}
				rowHeader="Lane"
				rowOrder={['ORD → ATL', 'LAX → DFW']}
				columnOrder={['Feb', 'Jan']}
			/>,
		)

		const headers = screen.getAllByRole('columnheader')

		expect(headers[1]?.textContent).toBe('Feb')

		expect(headers[2]?.textContent).toBe('Jan')

		const rows = screen.getAllByRole('row')

		expect(rows[1]?.textContent?.startsWith('ORD → ATL')).toBe(true)

		expect(rows[2]?.textContent?.startsWith('LAX → DFW')).toBe(true)
	})
})
