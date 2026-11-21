/**
 * The at-rest editable grid: no row is in edit mode, so the mount scenarios
 * measure the editing augmentation's per-cell overhead (each cell wired for
 * editing) without mounting an editor per cell. Against the same rungs in
 * `grid.bench.tsx`, the difference is what `editable` costs a grid nobody is
 * editing. The new-row scenario mounts one row of editors, the new-row slot,
 * beside the rows at rest. The scenarios of an open session are in
 * `grid-editing-session.bench.tsx`.
 */

import { Grid } from '../modules/grid'
import type { GridEditableConfig } from '../modules/grid/grid-editing-types'
import type { GridColumn } from '../modules/grid/types'
import { noop } from '../utilities/noop'
import { compareBenches } from './compare'
import { type Shipment, shipmentKey, shipments } from './fixtures'
import { COLUMNS, SIZES } from './grid-editing-fixtures'
import { mountBench, mountBenches } from './harness'

/** The same set fronted by a selection checkbox column. */
const SELECTABLE: GridColumn<Shipment>[] = [
	{ id: '__select', title: '', selectable: true },
	...COLUMNS,
]

/** No row in edit mode: the augmentation is armed, no editor is mounted. */
const EDITABLE = { rows: new Set<string | number>(), onCommit: noop }

compareBenches('Grid · editable initial render', (bench) => {
	mountBenches(
		bench,
		SIZES,
		(rows) => `${rows.length.toLocaleString()} rows × 8 cols`,
		(rows) => <Grid columns={COLUMNS} rows={rows} getKey={shipmentKey} editable={EDITABLE} />,
	)
})

compareBenches('Grid · editable with selection', (bench) => {
	const selection = new Set(
		shipments(1_000)
			.filter((_, index) => index % 10 === 0)
			.map(shipmentKey),
	)

	mountBench(bench, '1,000 rows · 10% selected', () => (
		<Grid
			columns={SELECTABLE}
			rows={shipments(1_000)}
			getKey={shipmentKey}
			editable={EDITABLE}
			selection={{ value: selection }}
		/>
	))
})

compareBenches('Grid · editable virtualized initial render', (bench) => {
	mountBenches(
		bench,
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
 * The at-rest grid with the new-row slot at the bottom. Against the initial
 * render above, the difference is what the slot costs a grid's mount: one row
 * of mounted editors, beside the same data rows.
 */
const NEW_ROW = {
	...EDITABLE,
	session: 'managed',
	newRow: 'bottom',
	onRowAdd: noop,
} satisfies GridEditableConfig

compareBenches('Grid · editable new row', (bench) => {
	mountBenches(
		bench,
		SIZES,
		(rows) => `${rows.length.toLocaleString()} rows × 8 cols · new row`,
		(rows) => <Grid columns={COLUMNS} rows={rows} getKey={shipmentKey} editable={NEW_ROW} />,
	)
})
