/**
 * The cost of the two edit paths that a user starts most often: a row that
 * opens and closes its edit, and a cell edit that moves to another cell.
 *
 * The row scenario toggles `editable.rows` between a set that holds one row and
 * an empty set. When the set holds the row, each editable cell of that row
 * mounts its editor. When the set is empty, the editors unmount. It runs on
 * 1,000 rows without a window, and on 10,000 rows with a window.
 *
 * The cell scenario runs a managed session with `scope: 'cell'`. It moves the
 * one open editor between the `origin` and `carrier` cells of one row, on 1,000
 * rows without a window.
 *
 * Each sample commits through `flushSync`, then reads the rect of the host so
 * the browser lays out the grid. Paint is outside the sample. After the read,
 * the sample counts the editors and throws on a count that the state does not
 * give. The two runs of 1,000 rows are the regression sentinels. A grid without
 * a window keeps each row mounted, so a cost that reaches each row shows there.
 *
 * The ui grid runs alone, without a rival score. AG Grid and MUI X open their
 * editors through their own APIs and focus models. The same toggle therefore
 * does not give equal work in each library.
 */

import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { describe } from 'vitest'
import { Grid, type GridCellRef, type GridColumn } from '../../modules/grid'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, painted } from './grid-contenders'
import { benches, host, type Prepared, WINDOW } from './harness'

// A `field` makes each column editable. The explicit `cell` renderer paints the
// content synchronously, as in `grid-resize-truncation.bench.tsx`.
const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({
	id,
	title,
	field: id,
	cell: (row) => String(row[id]),
}))

const noop = () => {}

/** The one empty set that each closed state shares, so no sample builds a new one. */
const CLOSED = new Set<string | number>()

/** The selector of an editor input. */
const EDITOR = '[data-slot="grid-edit-input"]'

/** How one grid mounts: with a window over the rows, or with each row in the DOM. */
type Shape = { windowed: boolean }

/**
 * Mounts one grid into a fixed box and returns a synchronous `draw`. The first
 * paint settles before the function returns.
 */
async function mount(rows: Shipment[], grid: () => ReactNode) {
	const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

	const root = createRoot(box)

	const draw = () => flushSync(() => root.render(grid()))

	draw()

	await painted(box, [rows[0]?.id ?? ''])

	return { box, draw }
}

/** The window props, or none, for a {@link Shape}. */
function windowProps({ windowed }: Shape) {
	return windowed ? { virtualize: true, maxHeight: `${GRID_HEIGHT}px` } : {}
}

/**
 * Mounts one grid and closes it over a row edit that opens and closes. The
 * sample throws if an open row shows no editor, or if a closed row shows one.
 */
async function prepareRow(name: string, rows: Shipment[], shape: Shape): Promise<Prepared> {
	const open = new Set<string | number>([rows[3]?.id ?? ''])

	let editing = false

	const { box, draw } = await mount(rows, () => (
		<Grid
			columns={COLUMNS}
			rows={rows}
			getKey={shipmentKey}
			{...windowProps(shape)}
			editable={{ rows: editing ? open : CLOSED, onRowsChange: noop, onCommit: noop }}
		/>
	))

	return {
		name,
		run: () => {
			editing = !editing

			draw()

			box.getBoundingClientRect()

			const editors = box.querySelectorAll(EDITOR).length

			if (editing ? editors === 0 : editors !== 0) {
				throw new Error(`${name}: ${editors} editors with the row ${editing ? 'open' : 'closed'}`)
			}
		},
	}
}

/**
 * Mounts one grid with a managed cell session and closes it over a move of the
 * open cell. The sample throws if the grid does not show exactly one editor.
 */
async function prepareCell(name: string, rows: Shipment[], shape: Shape): Promise<Prepared> {
	const rowKey = rows[3]?.id ?? ''

	const editRows = new Set<string | number>([rowKey])

	const origin: GridCellRef = { rowKey, columnId: 'origin' }

	const carrier: GridCellRef = { rowKey, columnId: 'carrier' }

	let cell = origin

	const { box, draw } = await mount(rows, () => (
		<Grid
			columns={COLUMNS}
			rows={rows}
			getKey={shipmentKey}
			{...windowProps(shape)}
			editable={{
				session: 'managed',
				scope: 'cell',
				rows: editRows,
				cell,
				onRowsChange: noop,
				onCellChange: noop,
				onCommit: noop,
			}}
		/>
	))

	return {
		name,
		run: () => {
			cell = cell === origin ? carrier : origin

			draw()

			box.getBoundingClientRect()

			const editors = box.querySelectorAll(EDITOR).length

			if (editors !== 1) throw new Error(`${name}: ${editors} editors after the move`)
		},
	}
}

const UNWINDOWED: Shape = { windowed: false }

const WINDOWED: Shape = { windowed: true }

const rows = [
	await prepareRow('1,000 rows · un-windowed', shipments(1_000), UNWINDOWED),
	await prepareRow('10,000 rows · windowed', shipments(10_000), WINDOWED),
]

const cells = [await prepareCell('1,000 rows · un-windowed', shipments(1_000), UNWINDOWED)]

describe('grid edit · row open + close', () => {
	benches(rows, WINDOW.slow)
})

describe('grid edit · cell move · scope cell', () => {
	benches(cells, WINDOW.slow)
})
