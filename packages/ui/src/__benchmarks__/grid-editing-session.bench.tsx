/**
 * The scenarios of an open session on an editable grid: a cell-scoped session
 * that moves, uncontrolled and controlled, a Tab move, a Tab commit through a
 * sync sink and through an async one, and a keystroke in an open row. The
 * at-rest mounts are in `grid-editing.bench.tsx`.
 */

import { act, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { Grid } from '../modules/grid'
import type { GridCellRef } from '../modules/grid/grid-editing-types'
import { noop } from '../utilities/noop'
import { compareBenches } from './compare'
import { type Shipment, shipmentKey } from './fixtures'
import { COLUMNS, SIZES } from './grid-editing-fixtures'
import { persistentTree } from './harness'

/**
 * Opens a cell-scoped session on the first row's reference cell, outside the
 * timed region. Returns the two cells of that row that the move scenarios
 * alternate between.
 */
function openSession(container: HTMLElement): HTMLElement[] {
	const cells = ['reference', 'origin'].map(
		(id) => container.querySelector(`td[data-grid-col="${id}"]`) as HTMLElement,
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
compareBenches('Grid · cell-scoped session move', (bench) => {
	for (const rows of SIZES) {
		let move = 0

		persistentTree(
			bench,
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

compareBenches('Grid · cell-scoped session move · controlled', (bench) => {
	for (const rows of SIZES) {
		let move = 0

		persistentTree(bench, <ControlledSession rows={rows} />, openSession).bench(
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
compareBenches('Grid · cell-scoped session Tab move', (bench) => {
	for (const rows of SIZES) {
		persistentTree(
			bench,
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
compareBenches('Grid · cell-scoped Tab commit', (bench) => {
	for (const [label, onCommit] of [
		['sync', noop],
		['async', acceptAsync],
	] as const) {
		for (const rows of SIZES) {
			let key = 0

			persistentTree(
				bench,
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
compareBenches('Grid · row session keystroke', (bench) => {
	for (const rows of SIZES) {
		let key = 0

		persistentTree(
			bench,
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
