/**
 * The at-rest editable grid: no row is in edit mode, so the mount scenarios
 * measure the editing augmentation's per-cell overhead — each cell wired for
 * editing — without mounting an editor per cell. Against the same rungs in
 * `grid.bench.tsx`, the difference is what `editable` costs a grid nobody is
 * editing. The session scenario is the exception: it opens a cell-scoped
 * session and moves it, which is the path the commit-and-move keys drive.
 */

import { fireEvent } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { Grid, type GridColumn } from '../modules/grid'
import { noop } from '../utilities/noop'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from './fixtures'
import { mountBench, mountBenches, persistentTree } from './harness'

const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) =>
	// The identity column stays read-only; every other column binds its field so
	// the editing augmentation has a target to wire.
	id === 'id'
		? { id, title, cell: (row) => String(row.id), readOnly: true }
		: { id, title, field: id, cell: (row) => String(row[id]) },
)

/** The same set fronted by a selection checkbox column. */
const SELECTABLE: GridColumn<Shipment>[] = [
	{ id: '__select', title: '', selectable: true },
	...COLUMNS,
]

/** No row in edit mode — the augmentation is armed, no editor is mounted. */
const EDITABLE = { rows: new Set<string | number>(), onCommit: noop }

// Built at collection time: only the render belongs inside the timed region.
const SIZES = [100, 500, 1_000].map((count) => shipments(count))

describe('Grid · editable initial render', () => {
	mountBenches(
		SIZES,
		(rows) => `${rows.length.toLocaleString()} rows × 8 cols`,
		(rows) => <Grid columns={COLUMNS} rows={rows} getKey={shipmentKey} editable={EDITABLE} />,
	)
})

describe('Grid · editable with selection', () => {
	const selection = new Set(
		shipments(1_000)
			.filter((_, index) => index % 10 === 0)
			.map(shipmentKey),
	)

	mountBench('1,000 rows · 10% selected', () => (
		<Grid
			columns={SELECTABLE}
			rows={shipments(1_000)}
			getKey={shipmentKey}
			editable={EDITABLE}
			selection={{ value: selection }}
		/>
	))
})

describe('Grid · editable virtualized initial render', () => {
	mountBenches(
		[shipments(1_000), shipments(10_000)],
		(rows) => `${rows.length.toLocaleString()} rows × 8 cols · virtualize`,
		(rows) => (
			<Grid
				columns={COLUMNS}
				rows={rows}
				getKey={shipmentKey}
				editable={EDITABLE}
				virtualize
				maxHeight="600px"
			/>
		),
	)
})

/**
 * A cell-scoped session moving between two cells of one row. The row is in the
 * set before the timed region starts, so each move changes only the session's
 * cell. That is the cost the commit-and-move keys pay on each keystroke. The
 * cells to move between are found once, outside the timed region.
 */
describe('Grid · cell-scoped session move', () => {
	for (const rows of SIZES) {
		const container = persistentTree(
			<Grid
				columns={COLUMNS}
				rows={rows}
				getKey={shipmentKey}
				editable={{ trigger: 'doubleClick', scope: 'cell', onCommit: noop }}
			/>,
		)

		const cells = ['reference', 'origin'].map(
			(col) => container.querySelector(`td[data-grid-col="${col}"]`) as HTMLElement,
		)

		fireEvent.doubleClick(cells[0] as HTMLElement)

		let move = 0

		bench(`${rows.length.toLocaleString()} rows × 8 cols · one move`, () => {
			move++

			fireEvent.doubleClick(cells[move % 2] as HTMLElement)
		})
	}
})
