import { createEmitter } from '../../../utilities'
import type { GridActiveEditStore } from '../grid-editing-context'
import { EMPTY_SET } from './grid-constants'
import { type GridActiveEdit, sameCell } from './grid-editing-utilities'

/** Whether two sets of row keys hold the same keys. @internal */
function sameKeys(a: ReadonlySet<string | number>, b: ReadonlySet<string | number>): boolean {
	if (a === b) return true

	if (a.size !== b.size) return false

	for (const key of a) if (!b.has(key)) return false

	return true
}

/**
 * Builds the store behind {@link GridActiveEditStore}. `seat` moves the coord
 * and the editable rows without a notice, for the render that resolves them.
 * The cells that render in that pass then read the new values. `set` moves the
 * coord and notifies the rest. It notifies only when the coord names another
 * cell than the listeners last heard, so a write that repeats the held cell
 * renders nothing. `setRows` does the same for the set of editable rows, by
 * its keys: a controlled `rows` built again with the same keys renders
 * nothing. `notify` tells every listener that a draft changed status.
 * @internal
 */
export function createActiveEditStore(): GridActiveEditStore & {
	seat: (next: GridActiveEdit | null, rows: ReadonlySet<string | number>) => void
	set: (next: GridActiveEdit | null) => void
	setRows: (next: ReadonlySet<string | number>) => void
	notify: () => void
} {
	let coord: GridActiveEdit | null = null

	let told: GridActiveEdit | null = null

	let rows: ReadonlySet<string | number> = EMPTY_SET

	let toldRows: ReadonlySet<string | number> = EMPTY_SET

	const { subscribe, emit } = createEmitter()

	return {
		subscribe,
		get: () => coord,
		rows: () => rows,
		seat: (next, nextRows) => {
			coord = next

			rows = nextRows
		},
		set: (next) => {
			coord = next

			if (sameCell(told, next)) return

			told = next

			emit()
		},
		setRows: (next) => {
			rows = next

			const same = sameKeys(toldRows, next)

			toldRows = next

			if (!same) emit()
		},
		notify: emit,
	}
}
