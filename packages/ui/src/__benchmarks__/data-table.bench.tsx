import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { DataTable, type DataTableColumn } from '../components/data-table'
import { makeShipments, type Shipment } from './fixtures'

const COLUMNS: DataTableColumn<Shipment>[] = [
	{ id: 'id', title: 'ID' },
	{ id: 'reference', title: 'Reference' },
	{ id: 'origin', title: 'Origin', sortable: true },
	{ id: 'destination', title: 'Destination', sortable: true },
	{ id: 'status', title: 'Status' },
	{ id: 'carrier', title: 'Carrier' },
	{ id: 'loads', title: 'Loads', sortable: true },
	{ id: 'weight', title: 'Weight' },
]

const getKey = (row: Shipment) => row.id

const rows100 = makeShipments(100)
const rows1k = makeShipments(1_000)
const rows5k = makeShipments(5_000)
const rows10k = makeShipments(10_000)

describe('DataTable · initial render', () => {
	bench('100 rows × 8 cols', () => {
		render(<DataTable columns={COLUMNS} rows={rows100} getRowKey={getKey} />)

		cleanup()
	})

	bench('1,000 rows × 8 cols', () => {
		render(<DataTable columns={COLUMNS} rows={rows1k} getRowKey={getKey} />)

		cleanup()
	})

	bench('5,000 rows × 8 cols', () => {
		render(<DataTable columns={COLUMNS} rows={rows5k} getRowKey={getKey} />)

		cleanup()
	})

	bench('10,000 rows × 8 cols', () => {
		render(<DataTable columns={COLUMNS} rows={rows10k} getRowKey={getKey} />)

		cleanup()
	})
})

describe('DataTable · with selection column', () => {
	const cols: DataTableColumn<Shipment>[] = [
		{ id: '__select', title: '', selectable: true },
		...COLUMNS,
	]

	bench('1,000 rows · 10% pre-selected', () => {
		const selection = new Set(rows1k.filter((_, i) => i % 10 === 0).map(getKey))

		render(<DataTable columns={cols} rows={rows1k} getRowKey={getKey} selection={selection} />)

		cleanup()
	})

	bench('1,000 rows · all selected', () => {
		const selection = new Set(rows1k.map(getKey))

		render(<DataTable columns={cols} rows={rows1k} getRowKey={getKey} selection={selection} />)

		cleanup()
	})
})

describe('DataTable · column-order logic (visibleColumns memo)', () => {
	// The row-mapping and visibleColumns computation happen on every render.
	// Isolate by rendering a minimal row set but varying column config.
	const manyColumns: DataTableColumn<Shipment>[] = Array.from({ length: 40 }, (_, i) => ({
		id: `col-${i}`,
		title: `Col ${i}`,
		cell: (row) => row.id,
	}))

	const hidden = new Set<string | number>(manyColumns.slice(0, 20).map((c) => c.id))
	const order = manyColumns.map((c) => c.id).reverse()

	bench('40 columns · half hidden · reversed order · 100 rows', () => {
		render(
			<DataTable
				columns={manyColumns}
				rows={rows100}
				getRowKey={getKey}
				hiddenColumns={hidden}
				columnOrder={order}
			/>,
		)

		cleanup()
	})
})

describe('DataTable · virtualized initial render', () => {
	bench('1,000 rows × 8 cols · virtualize', () => {
		render(
			<DataTable columns={COLUMNS} rows={rows1k} getRowKey={getKey} virtualize maxHeight="600px" />,
		)

		cleanup()
	})

	bench('10,000 rows × 8 cols · virtualize', () => {
		render(
			<DataTable
				columns={COLUMNS}
				rows={rows10k}
				getRowKey={getKey}
				virtualize
				maxHeight="600px"
			/>,
		)

		cleanup()
	})
})

describe('DataTable · rerender after selection toggle (1,000 rows)', () => {
	bench('5 toggles/iter', () => {
		const cols: DataTableColumn<Shipment>[] = [
			{ id: '__select', title: '', selectable: true },
			...COLUMNS,
		]

		let selection = new Set<string | number>()
		const { rerender } = render(
			<DataTable columns={cols} rows={rows1k} getRowKey={getKey} selection={selection} />,
		)

		for (let i = 0; i < 5; i++) {
			const key = getKey(rows1k[i * 100] as Shipment)

			selection = new Set(selection)
			selection.add(key)

			rerender(<DataTable columns={cols} rows={rows1k} getRowKey={getKey} selection={selection} />)
		}

		cleanup()
	})
})
