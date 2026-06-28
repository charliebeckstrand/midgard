import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { Grid, type GridColumn } from '../modules/grid'
import { makeShipments, type Shipment } from './fixtures'

const COLUMNS: GridColumn<Shipment>[] = [
	{ id: 'id', title: 'ID', cell: (row) => String(row.id), readOnly: true },
	{ id: 'reference', title: 'Reference', field: 'reference', cell: (row) => row.reference },
	{ id: 'origin', title: 'Origin', field: 'origin', cell: (row) => row.origin },
	{ id: 'destination', title: 'Destination', field: 'destination', cell: (row) => row.destination },
	{ id: 'status', title: 'Status', field: 'status', cell: (row) => row.status },
	{ id: 'carrier', title: 'Carrier', field: 'carrier', cell: (row) => row.carrier },
	{ id: 'loads', title: 'Loads', field: 'loads', cell: (row) => String(row.loads) },
	{ id: 'weight', title: 'Weight', field: 'weight', cell: (row) => String(row.weight) },
]

const getKey = (row: Shipment) => row.id

const rows100 = makeShipments(100)
const rows500 = makeShipments(500)
const rows1k = makeShipments(1_000)
const rows10k = makeShipments(10_000)

// The at-rest editable grid: no row is in edit mode, so the benchmark measures
// the editing augmentation's per-cell overhead (each cell wired for editing)
// without mounting an editor per cell.
const editableOf = (_rows: Shipment[]) => ({
	rows: new Set<string | number>(),
	onValueChange: noop,
})

describe('Grid · editable initial render', () => {
	bench('100 rows × 8 cols', () => {
		render(<Grid columns={COLUMNS} rows={rows100} getKey={getKey} editable={editableOf(rows100)} />)

		cleanup()
	})

	bench('500 rows × 8 cols', () => {
		render(<Grid columns={COLUMNS} rows={rows500} getKey={getKey} editable={editableOf(rows500)} />)

		cleanup()
	})

	bench('1,000 rows × 8 cols', () => {
		render(<Grid columns={COLUMNS} rows={rows1k} getKey={getKey} editable={editableOf(rows1k)} />)

		cleanup()
	})
})

describe('Grid · editable with selection', () => {
	const cols: GridColumn<Shipment>[] = [{ id: '__select', title: '', selectable: true }, ...COLUMNS]

	bench('1,000 rows · 10% selected', () => {
		const selection = new Set(rows1k.filter((_, i) => i % 10 === 0).map(getKey))

		render(
			<Grid
				columns={cols}
				rows={rows1k}
				getKey={getKey}
				editable={editableOf(rows1k)}
				selection={{ value: selection }}
			/>,
		)

		cleanup()
	})
})

describe('Grid · editable virtualized initial render', () => {
	bench('1,000 rows × 8 cols · virtualize', () => {
		render(
			<Grid
				columns={COLUMNS}
				rows={rows1k}
				getKey={getKey}
				editable={editableOf(rows1k)}
				virtualize
				maxHeight="600px"
			/>,
		)

		cleanup()
	})

	bench('10,000 rows × 8 cols · virtualize', () => {
		render(
			<Grid
				columns={COLUMNS}
				rows={rows10k}
				getKey={getKey}
				editable={editableOf(rows10k)}
				virtualize
				maxHeight="600px"
			/>,
		)

		cleanup()
	})
})

function noop() {}
