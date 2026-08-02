/**
 * The at-rest editable grid: no row is in edit mode, so every scenario
 * measures the editing augmentation's per-cell overhead — each cell wired for
 * editing — without mounting an editor per cell. Against the same rungs in
 * `grid.bench.tsx`, the difference is what `editable` costs a grid nobody is
 * editing.
 */

import { describe } from 'vitest'
import { Grid, type GridColumn } from '../modules/grid'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from './fixtures'
import { mountBench, mountBenches, noop } from './harness'

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
const SIZES = [100, 500, 1_000].map((count) => ({ count, rows: shipments(count) }))

const rows1k = shipments(1_000)

const rows10k = shipments(10_000)

describe('Grid · editable initial render', () => {
	mountBenches(
		SIZES,
		({ count }) => `${count.toLocaleString()} rows × 8 cols`,
		({ rows }) => <Grid columns={COLUMNS} rows={rows} getKey={shipmentKey} editable={EDITABLE} />,
	)
})

describe('Grid · editable with selection', () => {
	const selection = new Set(rows1k.filter((_, index) => index % 10 === 0).map(shipmentKey))

	mountBench('1,000 rows · 10% selected', () => (
		<Grid
			columns={SELECTABLE}
			rows={rows1k}
			getKey={shipmentKey}
			editable={EDITABLE}
			selection={{ value: selection }}
		/>
	))
})

describe('Grid · editable virtualized initial render', () => {
	mountBenches(
		[
			{ count: 1_000, rows: rows1k },
			{ count: 10_000, rows: rows10k },
		],
		({ count }) => `${count.toLocaleString()} rows × 8 cols · virtualize`,
		({ rows }) => (
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
