import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { Grid, type GridColumn, type SortState } from '../modules/grid'
import { makeShipments, type Shipment } from './fixtures'

const COLUMNS: GridColumn<Shipment>[] = [
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

describe('Grid · initial render', () => {
	bench('100 rows × 8 cols', () => {
		render(<Grid columns={COLUMNS} rows={rows100} getKey={getKey} />)

		cleanup()
	})

	bench('1,000 rows × 8 cols', () => {
		render(<Grid columns={COLUMNS} rows={rows1k} getKey={getKey} />)

		cleanup()
	})

	bench('5,000 rows × 8 cols', () => {
		render(<Grid columns={COLUMNS} rows={rows5k} getKey={getKey} />)

		cleanup()
	})

	bench('10,000 rows × 8 cols', () => {
		render(<Grid columns={COLUMNS} rows={rows10k} getKey={getKey} />)

		cleanup()
	})
})

describe('Grid · with selection column', () => {
	const cols: GridColumn<Shipment>[] = [{ id: '__select', title: '', selectable: true }, ...COLUMNS]

	bench('1,000 rows · 10% pre-selected', () => {
		const selection = new Set(rows1k.filter((_, i) => i % 10 === 0).map(getKey))

		render(<Grid columns={cols} rows={rows1k} getKey={getKey} selection={{ value: selection }} />)

		cleanup()
	})

	bench('1,000 rows · all selected', () => {
		const selection = new Set(rows1k.map(getKey))

		render(<Grid columns={cols} rows={rows1k} getKey={getKey} selection={{ value: selection }} />)

		cleanup()
	})
})

describe('Grid · column-order logic (visibleColumns memo)', () => {
	// The row-mapping and visibleColumns computation happen on every render.
	// Isolate by rendering a minimal row set but varying column config.
	const manyColumns: GridColumn<Shipment>[] = Array.from({ length: 40 }, (_, i) => ({
		id: `col-${i}`,
		title: `Col ${i}`,
		cell: (row) => row.id,
	}))

	const hidden = new Set<string | number>(manyColumns.slice(0, 20).map((c) => c.id))

	const order = manyColumns.map((c) => c.id).reverse()

	bench('40 columns · half hidden · reversed order · 100 rows', () => {
		render(
			<Grid
				columns={manyColumns}
				rows={rows100}
				getKey={getKey}
				columnOrder={{ value: order }}
				columnManager={{ hidden }}
			/>,
		)

		cleanup()
	})
})

describe('Grid · virtualized initial render', () => {
	bench('1,000 rows × 8 cols · virtualize', () => {
		render(<Grid columns={COLUMNS} rows={rows1k} getKey={getKey} virtualize maxHeight="600px" />)

		cleanup()
	})

	bench('10,000 rows × 8 cols · virtualize', () => {
		render(<Grid columns={COLUMNS} rows={rows10k} getKey={getKey} virtualize maxHeight="600px" />)

		cleanup()
	})
})

describe('Grid · rerender after sort toggle (1,000 rows · truncating)', () => {
	// A resizable grid is fixed-layout and truncating, so every visible cell
	// mounts a `GridCellContent`. This exercises the path the performance audit
	// flagged: a sort change must not re-render every truncating cell (each reads
	// only the narrow resizing context, not the table-wide value the sort lives in).
	bench('5 toggles/iter', () => {
		let sort: SortState[] = [{ column: 'origin', direction: 'asc' }]

		const { rerender } = render(
			<Grid columns={COLUMNS} rows={rows1k} getKey={getKey} resizable sort={{ value: sort }} />,
		)

		for (let i = 0; i < 5; i++) {
			sort = [{ column: 'origin', direction: i % 2 === 0 ? 'desc' : 'asc' }]

			rerender(
				<Grid columns={COLUMNS} rows={rows1k} getKey={getKey} resizable sort={{ value: sort }} />,
			)
		}

		cleanup()
	})
})

describe('Grid · rerender after selection toggle (1,000 rows)', () => {
	bench('5 toggles/iter', () => {
		const cols: GridColumn<Shipment>[] = [
			{ id: '__select', title: '', selectable: true },
			...COLUMNS,
		]

		let selection = new Set<string | number>()

		const { rerender } = render(
			<Grid columns={cols} rows={rows1k} getKey={getKey} selection={{ value: selection }} />,
		)

		for (let i = 0; i < 5; i++) {
			const key = getKey(rows1k[i * 100] as Shipment)

			selection = new Set(selection)

			selection.add(key)

			rerender(
				<Grid columns={cols} rows={rows1k} getKey={getKey} selection={{ value: selection }} />,
			)
		}

		cleanup()
	})
})
