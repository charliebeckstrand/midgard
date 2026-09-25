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
	placeEntries,
	readingOrder,
	resolveLayout,
	sameCell,
	sameGeometry,
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
	/**
	 * The ids of the tiles that the children of the board declare when the board
	 * mounts. Until the first tile registers, each of them counts as on the board.
	 *
	 * @remarks
	 * The board reads each `DashboardTile` child, also inside a Fragment, and each
	 * spec tile of a `DashboardTiles` child. A component that renders a tile hides
	 * its id. Each declared tile registers in the first commit, so the board reads
	 * the ids once.
	 */
	declared: ReadonlySet<string>
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
	/**
	 * The first saved entry of each id, for a tile that has not registered yet. It
	 * holds the place that `placeEntries` gives the entry.
	 */
	entries: ReadonlyMap<string, DashboardLayoutItem>
	/** The cell where a dragged tile lands, which is its start cell when a drop changes nothing. */
	placeholder: DashboardCell | null
	/** The travel range of the dragged tile, or `null` at rest. */
	travel: DashboardDragTravel | null
	/**
	 * Whether the responsive projection replaces the saved layout on screen. It
	 * stays until the width passes the threshold by `PROJECTION_HOLD`. A change of
	 * the canonical geometry, the demands, or the grid ends the hold.
	 */
	projected: boolean
	/** Whether the gestures are live: edit mode, and no projection. */
	editable: boolean
	/**
	 * The selections that apply: those of the board, and those of a tile on the
	 * board. Until the first tile registers, as on the server, a tile with a saved
	 * entry or a declared tile counts as on the board.
	 */
	selections: readonly DashboardSelection[]
	/**
	 * The ids of the tiles in reading order, which the tiles take in the markup. A
	 * registered tile ranks by its canonical cell, and an entry with no registered
	 * tile by the place that `placeEntries` gives it. It holds still in edit mode,
	 * so a gesture never moves a tile in the DOM. When edit mode ends, it takes the
	 * new order.
	 */
	order: readonly string[]
}

/** The store interface that the shell uses. */
export type DashboardStore = {
	/** The current inputs. */
	getState: () => DashboardState
	/** The current view. The same state always returns the same object. */
	getView: () => DashboardView
	/** The state that the store started with. No effect runs on the server, so the server renders it. */
	getInitialState: () => DashboardState
	/**
	 * The view of the initial state. A hydration render reads it, so a boundary
	 * that hydrates after the tiles register still matches the server markup.
	 */
	getInitialView: () => DashboardView
	/** Merges `patch` into the state, and notifies the listeners while the store is open. */
	setState: (patch: Partial<DashboardState>) => void
	/**
	 * Registers the demands of a tile, or updates them in place. A `ratio` or a
	 * `minWidth` that is not a usable number registers as absent.
	 */
	register: (id: string, demands: DashboardTileDemands) => void
	/** Removes the demands of a tile. */
	unregister: (id: string) => void
	/**
	 * Opens a closed store. It derives the view of the current state, and it
	 * notifies the listeners. A new store is open.
	 */
	open: () => void
	/**
	 * Closes the store. A change then updates the state and notifies no listener,
	 * so an unmount of the board wakes no reader for each tile that goes. A read
	 * of the view still derives it.
	 */
	close: () => void
	/** Adds a listener, and returns the function that removes it. */
	subscribe: (listener: () => void) => () => void
}

/**
 * The hold of the responsive projection, in px. A projection on screen reads the
 * container width less the hold, so the saved layout returns only past the
 * threshold plus the hold.
 *
 * @remarks
 * In a scroll box with a classic scrollbar, the width of the board can follow its
 * height. When the saved layout overflows the box and the projection fits it, the
 * scrollbar comes and goes with the projection. With no hold, the board then
 * switches between the two on each frame. A classic scrollbar is about 15 px
 * wide, and the hold covers a scrollbar up to 24 px wide. One of the two states
 * therefore holds.
 *
 * A wider scrollbar, such as a styled `::-webkit-scrollbar` of 30 px, still
 * switches the board on each frame. A scroll box with `scrollbar-gutter: stable`
 * always reserves the width of its scrollbar, so no scrollbar starts the loop.
 */
const PROJECTION_HOLD = 24

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

/** Returns `next`, or `previous` when the two lists hold the same items in the same order. */
export function internList<T>(
	previous: readonly T[] | undefined,
	next: readonly T[],
): readonly T[] {
	if (previous === undefined || previous.length !== next.length) return next

	return previous.every((item, index) => item === next[index]) ? previous : next
}

/** Creates a store with the given initial state. */
export function createDashboardStore(initial: DashboardState): DashboardStore {
	let state = initial

	let view: DashboardView | null = null

	// The state that `view` comes from. It falls behind only while the store is closed.
	let viewed: DashboardState | null = null

	let closed = false

	// Whether a tile has registered. An empty set of demands then means that no tile is left.
	let registered = false

	const listeners = new Set<() => void>()

	// The first entry of each id, placed with provisional heights. A tile that has not registered
	// paints it, so the server markup shows no clamp overlap of two tiles with saved heights.
	const placedOf = memo(placeEntries)

	const entriesOf = memo(
		(layout: readonly DashboardLayoutItem[]) => new Map(layout.map((item) => [item.id, item])),
	)

	const canonicalOf = memo(resolveLayout)

	// A registered tile ranks by its canonical cell, and an entry with no registered tile by its
	// placed entry. Before any tile registers, only the placed entries rank, so the server
	// markup and the first client render agree. After that, the order follows the painted rows.
	const orderOf = memo(
		(
			canonical: readonly DashboardCell[],
			placed: readonly DashboardLayoutItem[],
			demands: ReadonlyMap<string, DashboardTileDemands>,
		) => readingOrder([...canonical, ...placed.filter((item) => !demands.has(item.id))]),
	)

	const project = (
		cells: readonly DashboardCell[],
		width: number,
		gap: number,
		columns: number,
		demands: ReadonlyMap<string, DashboardTileDemands>,
	) => projectLayout(cells, { width, gap, columns, demands })

	// One slot for the full width and one for the held width, so that the two keep their results.
	const projectionOf = memo(project)

	const heldOf = memo(project)

	const derive = (previous: DashboardView | null, from: DashboardState | null): DashboardView => {
		const { columns, gap, editing, layout, demands, declared, width, gesture, selections } = state

		const canonical = canonicalOf(layout, demands, columns)

		const measured = gesture?.width ?? width

		const full = projectionOf(canonical, measured, gap, columns, demands)

		// The hold keeps a projection on screen only while the resolved cells, the demands, and
		// the grid stay the same. After a change of one of them, the view is that of a new store.
		// The cells compare by geometry, because a controlled app can render an equal layout in a
		// new array on each render.
		const sameBoard =
			from !== null &&
			previous !== null &&
			(previous.canonical === canonical || sameGeometry(previous.canonical, canonical)) &&
			from.demands === demands &&
			from.columns === columns &&
			from.gap === gap

		// A projection on screen reads the held width. The first projected frame reads it
		// too, so a later change of a selection or of edit mode moves no tile.
		const held = measured > 0 && ((sameBoard && previous?.projected === true) || !full.identity)

		const projection = held
			? heldOf(canonical, Math.max(1, measured - PROJECTION_HOLD), gap, columns, demands)
			: full

		const placed = placedOf(layout, columns)

		const entries = entriesOf(placed)

		// No tile registers on the server, so until then each saved entry and each declared tile
		// stands for a tile.
		const mounted =
			registered || demands.size > 0
				? demands
				: { has: (id: string) => entries.has(id) || declared.has(id) }

		return {
			canonical,
			cells: paintedCells(gesture, projection.cells, previous?.cells),
			entries,
			placeholder: landingCell(gesture, previous?.placeholder),
			travel: travelOf(gesture, columns, previous?.travel),
			projected: !projection.identity,
			editable: editing && projection.identity,
			// Interned, so a mount that leaves the live selections as they were wakes no reader.
			selections: internList(previous?.selections, liveSelections(selections, mounted)),
			order:
				editing && previous !== null
					? previous.order
					: internList(previous?.order, orderOf(canonical, placed, demands)),
		}
	}

	/** The view of the current state. */
	const current = (): DashboardView => {
		if (view === null || viewed !== state) {
			view = derive(view, viewed)

			viewed = state
		}

		return view
	}

	const notify = () => {
		current()

		for (const listener of listeners) listener()
	}

	const replace = (next: DashboardState) => {
		state = next

		if (!closed) notify()
	}

	// The server renders the view of the initial state, so the store keeps that view.
	const first = current()

	return {
		getState: () => state,
		getView: current,
		getInitialState: () => initial,
		getInitialView: () => first,
		setState: (patch) => replace({ ...state, ...patch }),
		register: (id, demands) => {
			registered = true

			replace({ ...state, demands: new Map(state.demands).set(id, usableDemands(demands)) })
		},
		unregister: (id) => {
			const rest = new Map(state.demands)

			rest.delete(id)

			replace({ ...state, demands: rest })
		},
		open: () => {
			if (!closed) return

			closed = false

			notify()
		},
		close: () => {
			closed = true
		},
		subscribe: (listener) => {
			listeners.add(listener)

			return () => {
				listeners.delete(listener)
			}
		},
	}
}
