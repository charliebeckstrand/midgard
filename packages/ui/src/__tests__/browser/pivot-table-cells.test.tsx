import { describe, expect, it } from 'vitest'
import { PivotTable } from '../../components/pivot-table'
import { present, renderUI, screen } from '../helpers'

type Row = { lane: string; carrier: string; cost: number }

const data: Row[] = [
	{ lane: 'LAX → DFW', carrier: 'Acme', cost: 1200 },
	{ lane: 'LAX → DFW', carrier: 'Swift', cost: 900 },
	{ lane: 'ORD → ATL', carrier: 'Acme', cost: 400 },
]

/** The cell that renders `text`. */
const cellOf = (text: string) =>
	present(screen.getByText(text).closest('td, th'), `the cell "${text}"`)

/**
 * The cells of a pivot table, styled as a real browser computes them. The
 * numbers align to the inline end, which is the left edge in a right-to-left
 * layout. A row header keeps one line, because the table scrolls when it is
 * too wide, so a wrap only makes the rows taller.
 */
describe('PivotTable cells (real browser)', () => {
	it('aligns the numbers to the inline end in a right-to-left layout', () => {
		renderUI(
			<div dir="rtl">
				<PivotTable
					rows={data}
					keys={{ row: 'lane', column: 'carrier', value: 'cost' }}
					rowHeader="Lane"
					totals="both"
				/>
			</div>,
		)

		for (const text of ['Acme', '1,200', '2,100', '1,600', '2,500']) {
			expect(getComputedStyle(cellOf(text)).textAlign).toBe('end')
		}
	})

	it('keeps each row header on one line', () => {
		renderUI(
			<PivotTable
				rows={data}
				keys={{ row: 'lane', column: 'carrier', value: 'cost' }}
				rowHeader="Lane"
				totals="both"
			/>,
		)

		for (const text of ['LAX → DFW', 'ORD → ATL', 'Total']) {
			const header = present(
				screen.getAllByText(text).find((node) => node.closest('tbody')),
				`the row header "${text}"`,
			)

			expect(getComputedStyle(header).whiteSpace).toBe('nowrap')
		}
	})
})
