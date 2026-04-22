import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { EditableGrid, type EditableGridColumn } from '../components/editable-grid'
import { makeShipments, type Shipment } from './fixtures'

const COLUMNS: EditableGridColumn<Shipment>[] = [
	{ id: 'id', title: 'ID', readOnly: true },
	{ id: 'reference', title: 'Reference', field: 'reference' },
	{ id: 'origin', title: 'Origin', field: 'origin' },
	{ id: 'destination', title: 'Destination', field: 'destination' },
	{ id: 'status', title: 'Status', field: 'status' },
	{ id: 'carrier', title: 'Carrier', field: 'carrier' },
	{ id: 'loads', title: 'Loads', field: 'loads' },
	{ id: 'weight', title: 'Weight', field: 'weight' },
]

const getKey = (row: Shipment) => row.id

const rows100 = makeShipments(100)
const rows500 = makeShipments(500)
const rows1k = makeShipments(1_000)
const rows10k = makeShipments(10_000)

describe('EditableGrid · initial render', () => {
	bench('100 rows × 8 cols', () => {
		render(<EditableGrid columns={COLUMNS} rows={rows100} getRowKey={getKey} onChange={noop} />)

		cleanup()
	})

	bench('500 rows × 8 cols', () => {
		render(<EditableGrid columns={COLUMNS} rows={rows500} getRowKey={getKey} onChange={noop} />)

		cleanup()
	})

	bench('1,000 rows × 8 cols', () => {
		render(<EditableGrid columns={COLUMNS} rows={rows1k} getRowKey={getKey} onChange={noop} />)

		cleanup()
	})
})

describe('EditableGrid · with selection', () => {
	const cols: EditableGridColumn<Shipment>[] = [
		{ id: '__select', title: '', selectable: true },
		...COLUMNS,
	]

	bench('1,000 rows · 10% selected', () => {
		const selection = new Set(rows1k.filter((_, i) => i % 10 === 0).map(getKey))

		render(
			<EditableGrid
				columns={cols}
				rows={rows1k}
				getRowKey={getKey}
				onChange={noop}
				selection={selection}
			/>,
		)

		cleanup()
	})
})

describe('EditableGrid · virtualized initial render', () => {
	bench('1,000 rows × 8 cols · virtualize', () => {
		render(
			<EditableGrid
				columns={COLUMNS}
				rows={rows1k}
				getRowKey={getKey}
				onChange={noop}
				virtualize
				maxHeight="600px"
			/>,
		)

		cleanup()
	})

	bench('10,000 rows × 8 cols · virtualize', () => {
		render(
			<EditableGrid
				columns={COLUMNS}
				rows={rows10k}
				getRowKey={getKey}
				onChange={noop}
				virtualize
				maxHeight="600px"
			/>,
		)

		cleanup()
	})
})

function noop() {}
