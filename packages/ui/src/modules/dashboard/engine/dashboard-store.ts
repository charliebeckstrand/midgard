/**
 * The state container of the dashboard. It has no framework dependency: the
 * React shell reads it through `useSyncExternalStore`.
 *
 * The store holds the inputs, and it derives the view that the tiles paint. The
 * view keeps each cell object whose geometry does not change. A tile that
 * selects its own cell with `Object.is` renders again only when that cell moves.
 * A drag preview therefore wakes only the tiles that it moves.
 */

import type { QueryGroup } from '../../query/engine/types'
import { type DashboardDragKind, type DashboardDragTravel, dragTravel } from './dashboard-drag'
import {
	type DashboardCell,
	type DashboardLayoutItem,
	type DashboardTileDemands,
	readingOrder,
	resolveLayout,
	sameCell,
	usableDemands,
} from './dashboard-layout'
import { projectLayout } from './dashboard-responsive'
import { type DashboardSelection, liveSelections } from './dashboard-scope'

/**
 * One live gesture, and the snapshot that it simulates from. The `settle` phase
 * follows a commit, and it paints the committed cells until the saved layout
 * arrives. A dropped tile therefore never shows its start cell for a frame.
 */
export type DashboardGesture = {
	/** The phase of the gesture. */
	kind: 'drag' | 'resize' | 'settle'
	/** The id of the tile that the gesture moves. */
	id: string
	/** The painted cells at the start of the gesture. A cancel returns to them. */
	snapshot: readonly DashboardCell[]
	/** The board that a commit now writes, or `null` when a commit changes nothing. */
	preview: readonly DashboardCell[] | null
	/** The kind of drag change that the preview shows. */
	change: DashboardDragKind | null
	/** The tile that a shift or a swap reorders against. */
	partner: string | null
	/** The container width at the start. The projection holds it until the gesture ends. */
	width: number
	/** The column pitch in px at the start. It converts the pointer travel to grid units. */
	pitch: number
	/** The inline direction of the canvas at the start: `1` for ltr, `-1` for rtl. See `inlineSign`. */
	inline: 1 | -1
}

/** The inputs of the store. */
export type DashboardState = {
	/** The column count. */
	columns: number
	/** The gutter in px. */
	gap: number
	/** Whether the app asks for edit mode. */
	editing: boolean
	/** The saved layout. */
	layout: readonly DashboardLayoutItem[]
	/** The demands of the mounted tiles, in mount order. */
	demands: ReadonlyMap<string, DashboardTileDemands>
	/** The container width in px, or `0` before the first measurement. */
	width: number
	/** The live gesture, or `null` at rest. */
	gesture: DashboardGesture | null
	/** The filter that the app owns. */
	filter: QueryGroup | undefined
	/** The cross-filter selections that the tiles made. */
	selections: readonly DashboardSelection[]
}

/** What the tiles paint, derived from the state. */
export type DashboardView = {
	/** The saved layout, resolved against the mounted tiles. Gestures commit against it. */
	canonical: readonly DashboardCell[]
	/** The painted cell of each mounted tile. A dragged tile keeps its start cell. */
	cells: ReadonlyMap<string, DashboardCell>
	/** The saved entries by id, for a tile that has not registered yet. */
	entries: ReadonlyMap<string, DashboardLayoutItem>
	/** The cell where a dragged tile lands, which is its start cell when a drop changes nothing. */
	placeholder: DashboardCell | null
	/** The travel range of the dragged tile, or `null` at rest. */
	travel: DashboardDragTravel | null
	/** Whether the responsive projection replaces the saved layout on screen. */
	projected: boolean
	/** Whether the gestures are live: edit mode, and no projection. */
	editable: boolean
	/** The selections that apply: those of the board, and those of a tile on the board. */
	selections: readonly DashboardSelection[]
	/**
	 * The ids of the saved entries in reading order, which the tiles take in the
	 * markup. It holds still in edit mode, so a gesture never moves a tile in the
	 * DOM. When edit mode ends, it takes the new order.
	 */
	order: readonly string[]
}

/** The store interface that the shell uses. */
export type DashboardStore = {
	/** The current inputs. */
	getState: () => DashboardState
	/** The current view. The same state always returns the same object. */
	getView: () => DashboardView
	/** Merges `patch` into the state, and notifies the listeners. */
	setState: (patch: Partial<DashboardState>) => void
	/**
	 * Registers the demands of a tile, and returns the function that unregisters it.
	 * A `ratio` or a `minWidth` that is not a usable number registers as absent.
	 */
	register: (id: string, demands: DashboardTileDemands) => () => void
	/** Adds a listener, and returns the function that removes it. */
	subscribe: (listener: () => void) => () => void
}

/** One memo slot: the result for the last inputs. */
type Memo<A extends readonly unknown[], R> = (...args: A) => R

/** Returns a function that recomputes only when an argument changes by identity. */
function memo<A extends readonly unknown[], R>(compute: (...args: A) => R): Memo<A, R> {
	let last: { args: A; result: R } | null = null

	return (...args) => {
		if (last !== null && args.every((arg, index) => Object.is(arg, last?.args[index]))) {
			return last.result
		}

		const result = compute(...args)

		last = { args, result }

		return result
	}
}

/** Returns `next`, or `previous` when the two cells have the same geometry. */
function intern(previous: DashboardCell | null | undefined, next: DashboardCell): DashboardCell {
	return previous != null && sameCell(previous, next) ? previous : next
}

/** The id of the dragged tile, or `null` when no drag is live. */
function draggedId(gesture: DashboardGesture | null): string | null {
	return gesture?.kind === 'drag' ? gesture.id : null
}

/**
 * The cells on screen: the preview of a live gesture, else its snapshot, else the
 * projection. A dragged tile keeps its start cell, because the pointer carries it.
 */
function paintedCells(
	gesture: DashboardGesture | null,
	projected: readonly DashboardCell[],
	previous: ReadonlyMap<string, DashboardCell> | undefined,
): Map<string, DashboardCell> {
	const painted = gesture === null ? projected : (gesture.preview ?? gesture.snapshot)

	const dragged = draggedId(gesture)

	const start = gesture?.snapshot.find((cell) => cell.id === dragged)

	const cells = new Map<string, DashboardCell>()

	for (const cell of painted) {
		const source = cell.id === dragged && start !== undefined ? start : cell

		cells.set(cell.id, intern(previous?.get(cell.id), source))
	}

	return cells
}

/**
 * The landing cell of the dragged tile: its cell in the preview, else its start
 * cell, where a drop changes nothing. A drag therefore always shows where the
 * tile lands. It returns `null` when no drag is live.
 */
function landingCell(
	gesture: DashboardGesture | null,
	previous: DashboardCell | null | undefined,
): DashboardCell | null {
	const dragged = draggedId(gesture)

	if (dragged === null) return null

	const landing = (gesture?.preview ?? gesture?.snapshot)?.find((cell) => cell.id === dragged)

	return landing === undefined ? null : intern(previous, landing)
}

/** The travel range of the dragged tile, or `null`. It keeps the previous object when equal. */
function travelOf(
	gesture: DashboardGesture | null,
	columns: number,
	previous: DashboardDragTravel | null | undefined,
): DashboardDragTravel | null {
	const dragged = draggedId(gesture)

	if (gesture === null || dragged === null) return null

	const travel = dragTravel(gesture.snapshot, dragged, columns)

	const same = previous != null && previous.maxX === travel.maxX && previous.maxY === travel.maxY

	return same ? previous : travel
}

/** Returns `next`, or `previous` when the two lists hold the same selections in the same order. */
function internSelections(
	previous: readonly DashboardSelection[] | undefined,
	next: readonly DashboardSelection[],
): readonly DashboardSelection[] {
	if (previous === undefined || previous.length !== next.length) return next

	return previous.every((item, index) => item === next[index]) ? previous : next
}

/** Returns `next`, or `previous` when the two orders hold the same ids in the same order. */
function internOrder(
	previous: readonly string[] | undefined,
	next: readonly string[],
): readonly string[] {
	if (previous === undefined || previous.length !== next.length) return next

	return previous.every((id, index) => id === next[index]) ? previous : next
}

/** Creates a store with the given initial state. */
export function createDashboardStore(initial: DashboardState): DashboardStore {
	let state = initial

	let view: DashboardView | null = null

	const listeners = new Set<() => void>()

	const entriesOf = memo(
		(layout: readonly DashboardLayoutItem[]) => new Map(layout.map((item) => [item.id, item])),
	)

	const canonicalOf = memo(resolveLayout)

	const orderOf = memo(readingOrder)

	const projectionOf = memo(
		(
			cells: readonly DashboardCell[],
			width: number,
			gap: number,
			columns: number,
			demands: ReadonlyMap<string, DashboardTileDemands>,
		) => projectLayout(cells, { width, gap, columns, demands }),
	)

	const derive = (previous: DashboardView | null): DashboardView => {
		const { columns, gap, editing, layout, demands, width, gesture, selections } = state

		const canonical = canonicalOf(layout, demands, columns)

		const projection = projectionOf(canonical, gesture?.width ?? width, gap, columns, demands)

		return {
			canonical,
			cells: paintedCells(gesture, projection.cells, previous?.cells),
			entries: entriesOf(layout),
			placeholder: landingCell(gesture, previous?.placeholder),
			travel: travelOf(gesture, columns, previous?.travel),
			projected: !projection.identity,
			editable: editing && projection.identity,
			// Interned, so a mount that leaves the live selections as they were wakes no reader.
			selections: internSelections(previous?.selections, liveSelections(selections, demands)),
			// The saved entries give the order, so the server renders the tiles in it too.
			order:
				editing && previous !== null
					? previous.order
					: internOrder(previous?.order, orderOf(layout)),
		}
	}

	const replace = (next: DashboardState) => {
		state = next

		view = derive(view)

		for (const listener of listeners) listener()
	}

	return {
		getState: () => state,
		getView: () => {
			view ??= derive(null)

			return view
		},
		setState: (patch) => replace({ ...state, ...patch }),
		register: (id, demands) => {
			replace({ ...state, demands: new Map(state.demands).set(id, usableDemands(demands)) })

			return () => {
				const rest = new Map(state.demands)

				rest.delete(id)

				replace({ ...state, demands: rest })
			}
		},
		subscribe: (listener) => {
			listeners.add(listener)

			return () => {
				listeners.delete(listener)
			}
		},
	}
}
