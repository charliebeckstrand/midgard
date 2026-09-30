/**
 * The cost of one move of the cell cursor, on 1,000 rows without a window. Each
 * sample presses ArrowDown or ArrowUp on the table, so the cursor steps between
 * two rows. The sample ends one rendered frame after the press, so the style
 * and layout work that the commit leaves to the browser is inside the sample.
 * A frame costs about 17 ms in the headless container (README), so a row reads
 * that much above the work.
 *
 * The `fill handle` row is an editable grid with a range, which shows the fill
 * handle on the active cell. The `navigable` row shows no handle, and is the
 * floor that the handle adds to.
 */

import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { bench, describe } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, painted } from './grids'
import { frame, host, WINDOW } from './harness'

// A `field` makes each column editable, so the grid can fill.
const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({
	id,
	title,
	field: id,
	cell: (row) => String(row[id]),
}))

const noop = () => {}

/** Resolves after the next rendered frame: the style, layout, and paint of that frame are done. */
async function rendered(): Promise<void> {
	await frame()

	await new Promise<void>((resolve) => {
		const channel = new MessageChannel()

		channel.port1.onmessage = () => resolve()

		channel.port2.postMessage(null)
	})
}

/** Presses one key on the table, as the browser sends it. */
function press(table: HTMLElement, key: string): void {
	table.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/** One mounted grid: its report name, the seat of its cursor, and the timed move. */
type Move = { name: string; seat: () => Promise<void>; run: () => Promise<void> }

/**
 * Mounts one grid and closes it over a step down and a step back up. The seat
 * focuses the table and steps the cursor a few rows down, clear of the head. It
 * runs before the warmup of the bench, because the mount of the next grid takes
 * the focus. The seat throws if the grid does not show the handle that `fills`
 * names. The sample throws if the cursor is not on the row that the step gives.
 */
async function prepare(
	name: string,
	rows: Shipment[],
	fills: boolean,
	grid: () => ReactNode,
): Promise<Move> {
	const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

	const root = createRoot(box)

	flushSync(() => root.render(grid()))

	await painted(box, [rows[0]?.id ?? ''])

	const table = box.querySelector<HTMLElement>('table[role="grid"]')

	if (!table) throw new Error(`${name}: no grid to move on`)

	const activeRow = () => box.querySelector('td[data-active]')?.closest('tr')?.rowIndex

	let start = 0

	let down = false

	return {
		name,
		seat: async () => {
			table.focus()

			for (let step = 0; step < 3; step++) {
				press(table, 'ArrowDown')

				await rendered()
			}

			if (Boolean(box.querySelector('[data-slot="grid-fill-handle"]')) !== fills) {
				throw new Error(`${name}: the grid shows ${fills ? 'no' : 'a'} fill handle`)
			}

			start = activeRow() ?? -1

			down = false
		},
		run: async () => {
			down = !down

			press(table, down ? 'ArrowDown' : 'ArrowUp')

			await rendered()

			const row = activeRow()

			if (row !== (down ? start + 1 : start)) {
				throw new Error(`${name}: the cursor is on row ${row}`)
			}
		},
	}
}

const rows = shipments(1_000)

const moves = [
	await prepare('1,000 rows · fill handle', rows, true, () => (
		<Grid
			columns={COLUMNS}
			rows={rows}
			getKey={shipmentKey}
			range
			editable={{ session: 'managed', scope: 'cell', onCommit: noop }}
		/>
	)),
	await prepare('1,000 rows · navigable', rows, false, () => (
		<Grid columns={COLUMNS} rows={rows} getKey={shipmentKey} navigable />
	)),
]

describe('grid cursor · arrow move · 1,000 rows · un-windowed', () => {
	for (const { name, seat, run } of moves) bench(name, run, { ...WINDOW.slow, setup: seat })
})
