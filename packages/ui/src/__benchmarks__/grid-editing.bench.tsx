/**
 * The at-rest editable grid: no row is in edit mode, so the mount scenarios
 * measure the editing augmentation's per-cell overhead — each cell wired for
 * editing — without mounting an editor per cell. Against the same rungs in
 * `grid.bench.tsx`, the difference is what `editable` costs a grid nobody is
 * editing. The session scenarios are the exception: they open a cell-scoped
 * session and move it, which is the path the commit-and-move keys drive. The
 * Tab commit pair stages a value on each move, so each move commits a batch,
 * through a sync sink and through an async one.
 */

import { act, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { describe } from 'vitest'
import { Grid, type GridCellRef, type GridColumn } from '../modules/grid'
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
 * Opens a cell-scoped session on the first row's reference cell, outside the
 * timed region. Returns the two cells of that row that the move scenarios
 * alternate between.
 */
function openSession(container: HTMLElement): HTMLElement[] {
	const cells = ['reference', 'origin'].map(
		(col) => container.querySelector(`td[data-grid-col="${col}"]`) as HTMLElement,
	)

	fireEvent.doubleClick(cells[0] as HTMLElement)

	return cells
}

/**
 * A cell-scoped session moving between two cells of one row. The row is in the
 * set before the timed region starts, so each move changes only the session's
 * cell. That is the cost the commit-and-move keys pay on each keystroke. The
 * cells to move between are found once, outside the timed region.
 */
describe('Grid · cell-scoped session move', () => {
	for (const rows of SIZES) {
		let move = 0

		persistentTree(
			<Grid
				columns={COLUMNS}
				rows={rows}
				getKey={shipmentKey}
				editable={{ session: 'managed', scope: 'cell', onCommit: noop }}
			/>,
			openSession,
		).bench(`${rows.length.toLocaleString()} rows × 8 cols · one move`, (cells) => {
			move++

			fireEvent.doubleClick(cells[move % 2] as HTMLElement)
		})
	}
})

/**
 * The session move above, under a controlled `cell`. The consumer applies
 * each move in its own state, so each move also renders the consumer and the
 * grid host. The cells still read the session's cell from the store, so only
 * the two cells of the move render again.
 */
function ControlledSession({ rows }: { rows: Shipment[] }) {
	const [activeCell, setActiveCell] = useState<GridCellRef | null>(null)

	return (
		<Grid
			columns={COLUMNS}
			rows={rows}
			getKey={shipmentKey}
			editable={{
				session: 'managed',
				scope: 'cell',
				onCommit: noop,
				cell: activeCell,
				onCellChange: setActiveCell,
			}}
		/>
	)
}

describe('Grid · cell-scoped session move · controlled', () => {
	for (const rows of SIZES) {
		let move = 0

		persistentTree(<ControlledSession rows={rows} />, openSession).bench(
			`${rows.length.toLocaleString()} rows × 8 cols · one move`,
			(cells) => {
				move++

				fireEvent.doubleClick(cells[move % 2] as HTMLElement)
			},
		)
	}
})

/**
 * An uncontrolled cell-scoped session that Tab moves along one row. Each press
 * commits the cell it leaves, reseats focus on the tab stop, and focuses the
 * next editor. The last column wraps to the first, so every press moves the
 * session.
 */
describe('Grid · cell-scoped session Tab move', () => {
	for (const rows of SIZES) {
		persistentTree(
			<Grid
				columns={COLUMNS}
				rows={rows}
				getKey={shipmentKey}
				editable={{ session: 'managed', scope: 'cell', onCommit: noop }}
			/>,
			openSession,
		).bench(`${rows.length.toLocaleString()} rows × 8 cols · one Tab`, () => {
			fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab' })
		})
	}
})

/** An async sink that accepts each batch at once, in a microtask. */
const acceptAsync = () => Promise.resolve()

/**
 * A cell-scoped session that stages a new value and commits it with Tab, so
 * each press sends one batch to the sink. The sync variant is the base. The
 * async variant holds the cell pending, and the timed body waits for the
 * settle, so it also times the pending and settled renders of that cell.
 */
describe('Grid · cell-scoped Tab commit', () => {
	for (const [label, onCommit] of [
		['sync', noop],
		['async', acceptAsync],
	] as const) {
		for (const rows of SIZES) {
			let key = 0

			persistentTree(
				<Grid
					columns={COLUMNS}
					rows={rows}
					getKey={shipmentKey}
					editable={{ session: 'managed', scope: 'cell', onCommit }}
				/>,
				openSession,
			).bench(`${rows.length.toLocaleString()} rows × 8 cols · one ${label} commit`, async () => {
				const input = document.activeElement as HTMLInputElement

				key++

				fireEvent.change(input, { target: { value: String(key) } })

				await act(async () => {
					fireEvent.keyDown(input, { key: 'Tab' })
				})
			})
		}
	}
})

/**
 * One keystroke in an editor of an open row-scoped session. The row's seven
 * editors are open before the timed region starts. A keystroke stages its
 * value in the session's draft store, which no cell subscribes to. So only the
 * editor that takes the keystroke renders again, at every size.
 */
describe('Grid · row session keystroke', () => {
	for (const rows of SIZES) {
		let key = 0

		persistentTree(
			<Grid
				columns={COLUMNS}
				rows={rows}
				getKey={shipmentKey}
				editable={{
					session: 'managed',
					defaultRows: new Set([shipmentKey(rows[0] as Shipment)]),
					onCommit: noop,
				}}
			/>,
			(container) =>
				container.querySelector('td[data-grid-col="reference"] input') as HTMLInputElement,
		).bench(`${rows.length.toLocaleString()} rows × 8 cols · one keystroke`, (input) => {
			key++

			fireEvent.change(input, { target: { value: `REF-${key}` } })
		})
	}
})
