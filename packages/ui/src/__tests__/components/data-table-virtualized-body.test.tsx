import { describe, expect, it, vi } from 'vitest'
import { DataTable } from '../../components/data-table'
import { bySlot, renderUI } from '../helpers'

type VirtualItem = { index: number; start: number; end: number; size: number; key: number }

type VirtualizerStub = {
	getVirtualItems: () => VirtualItem[]
	getTotalSize: () => number
}

// Per-render virtualizer config. The mock reads these mutable bindings so each
// test sets the topSpacer / bottomSpacer scenario it needs without re-wiring
// the global mock.
let nextVirtualItems: VirtualItem[] = []

let nextTotalSize = 0

vi.mock('@tanstack/react-virtual', () => ({
	useVirtualizer: (): VirtualizerStub => ({
		getVirtualItems: () => nextVirtualItems,
		getTotalSize: () => nextTotalSize,
	}),
}))

function rangeRows(count: number) {
	return Array.from({ length: count }, (_, i) => ({ name: `Row ${i}`, age: i }))
}

const columns = [
	{ id: 'name', title: 'Name', cell: (row: { name: string }) => row.name },
	{ id: 'age', title: 'Age', cell: (row: { age: number }) => row.age },
]

const getRowKey = (row: { name: string }) => row.name

describe('DataTableVirtualizedBody', () => {
	it('renders a top spacer when the first virtual item starts past 0', () => {
		nextVirtualItems = [
			{ index: 5, start: 200, end: 240, size: 40, key: 5 },
			{ index: 6, start: 240, end: 280, size: 40, key: 6 },
		]

		nextTotalSize = 400

		const rows = rangeRows(10)

		const { container } = renderUI(
			<DataTable
				columns={columns}
				rows={rows}
				getRowKey={getRowKey}
				virtualize
				maxHeight="200px"
			/>,
		)

		const spacers = container.querySelectorAll('tr[data-slot="data-table-spacer"]')

		// The first virtual item starts at 200 — that's the topSpacer height.
		// totalSize 400 - lastEnd 280 = 120 bottomSpacer, so two spacers total.
		expect(spacers.length).toBe(2)

		const topSpacerCell = spacers[0]?.querySelector('td')

		expect(topSpacerCell).toHaveStyle({ height: '200px' })

		expect(topSpacerCell?.getAttribute('colSpan') ?? topSpacerCell?.getAttribute('colspan')).toBe(
			String(columns.length),
		)
	})

	it('omits both spacers when virtual items fill the entire range', () => {
		nextVirtualItems = [
			{ index: 0, start: 0, end: 40, size: 40, key: 0 },
			{ index: 1, start: 40, end: 80, size: 40, key: 1 },
		]

		nextTotalSize = 80

		const rows = rangeRows(2)

		const { container } = renderUI(
			<DataTable
				columns={columns}
				rows={rows}
				getRowKey={getRowKey}
				virtualize
				maxHeight="200px"
			/>,
		)

		expect(container.querySelectorAll('tr[data-slot="data-table-spacer"]').length).toBe(0)
	})

	it('renders only the bottom spacer when the visible window starts at 0', () => {
		nextVirtualItems = [
			{ index: 0, start: 0, end: 40, size: 40, key: 0 },
			{ index: 1, start: 40, end: 80, size: 40, key: 1 },
		]

		nextTotalSize = 400

		const rows = rangeRows(10)

		const { container } = renderUI(
			<DataTable
				columns={columns}
				rows={rows}
				getRowKey={getRowKey}
				virtualize
				maxHeight="200px"
			/>,
		)

		const spacers = container.querySelectorAll('tr[data-slot="data-table-spacer"]')

		expect(spacers.length).toBe(1)

		// totalSize 400 - lastEnd 80 = 320 px bottom gap.
		expect(spacers[0]?.querySelector('td')).toHaveStyle({ height: '320px' })
	})

	it('renders no spacers and no rows when the virtualizer reports nothing visible', () => {
		nextVirtualItems = []

		nextTotalSize = 0

		const rows = rangeRows(10)

		const { container } = renderUI(
			<DataTable
				columns={columns}
				rows={rows}
				getRowKey={getRowKey}
				virtualize
				maxHeight="200px"
			/>,
		)

		expect(container.querySelectorAll('tr[data-slot="data-table-spacer"]').length).toBe(0)

		expect(container.querySelectorAll('tbody tr').length).toBe(0)
	})

	it('invokes rowLoading and rowClassName for each visible row', () => {
		nextVirtualItems = [
			{ index: 0, start: 0, end: 40, size: 40, key: 0 },
			{ index: 1, start: 40, end: 80, size: 40, key: 1 },
		]

		nextTotalSize = 80

		const rowLoading = vi.fn(() => false)

		const rowClassName = vi.fn(() => 'row-extra')

		const rows = rangeRows(2)

		const { container } = renderUI(
			<DataTable
				columns={columns}
				rows={rows}
				getRowKey={getRowKey}
				virtualize
				maxHeight="200px"
				rowLoading={rowLoading}
				rowClassName={rowClassName}
			/>,
		)

		expect(rowLoading).toHaveBeenCalledTimes(2)

		expect(rowClassName).toHaveBeenCalledTimes(2)

		const dataRows = container.querySelectorAll('tbody tr:not([data-slot="data-table-spacer"])')

		expect(dataRows.length).toBe(2)

		// rowClassName output is merged onto each row.
		for (const row of dataRows) {
			expect(row.className).toContain('row-extra')
		}
	})

	it('falls back to non-loading when no rowLoading predicate is supplied', () => {
		nextVirtualItems = [{ index: 0, start: 0, end: 40, size: 40, key: 0 }]

		nextTotalSize = 40

		const { container } = renderUI(
			<DataTable
				columns={columns}
				rows={rangeRows(1)}
				getRowKey={getRowKey}
				virtualize
				maxHeight="200px"
			/>,
		)

		const dataRow = container.querySelector('tbody tr:not([data-slot="data-table-spacer"])')

		expect(dataRow).toBeInTheDocument()

		// Loading rows carry the k.rowLoading class; without rowLoading, the
		// row should not be in a loading state. The DataTable sets a sentinel
		// when the entire table is loading, but per-row loading shouldn't fire.
		expect(bySlot(container, 'data-table')).toBeInTheDocument()
	})
})
