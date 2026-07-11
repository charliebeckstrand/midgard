/**
 * Public schema for the dashboard module: the persisted layout item, its
 * controlled / uncontrolled binding, and the gesture event payloads. The
 * geometry here is everything a consumer stores — content demands (aspect
 * ratio, minimum width) live on each `DashboardItem`, so a saved layout
 * stays four integers per tile.
 */

/**
 * One tile's saved geometry, in integer grid units over the grid's columns.
 * Row units are a quarter of a column's width, so heights track the
 * container the way widths do and a saved layout renders at every size.
 */
export type DashboardLayoutItem = {
	/** Matches the `id` of a mounted `DashboardItem`. */
	id: string
	/** Leftmost column, `0`-based, within `[0, columns - w]`. */
	x: number
	/**
	 * Top row, `0`-based. Persisted exactly: the canvas never repacks tiles,
	 * so what you save is what renders — gaps included.
	 */
	y: number
	/** Column span, at least `1`. */
	w: number
	/**
	 * Row span. Omit it for a ratio-locked tile — the height derives from the
	 * width and the item's `ratio`, and the binding emits it stripped, so a
	 * later ratio change never fights a stale stored height.
	 */
	h?: number
	/**
	 * A static tile never moves: it neither drags, swaps, nor resizes, and it
	 * takes no handles in editing mode.
	 * @defaultValue false
	 */
	static?: boolean
}

/**
 * The layout binding, on the house `value` / `defaultValue` / `onValueChange`
 * triad. Omitted entirely, the grid runs uncontrolled from nothing: every
 * mounted item auto-slots below the last row in mount order. Items mounted
 * without a matching entry auto-slot the same way; entries whose item
 * unmounted are ignored and their cell is left open — the canvas never
 * repacks, and the canonical array is never mutated on unmount.
 */
export type DashboardLayoutBinding = {
	/** Controlled layout. `undefined` leaves the grid uncontrolled. */
	value?: DashboardLayoutItem[]
	/** Initial layout when uncontrolled. */
	defaultValue?: DashboardLayoutItem[]
	/**
	 * Fires on every committed mutation — a drop, a resize's end, an
	 * auto-slot. Ratio-locked items emit without `h`.
	 */
	onValueChange?: (layout: DashboardLayoutItem[]) => void
}

/**
 * Payload for the gesture-start brackets (`onDragStart` / `onResizeStart`):
 * the tile and the canonical layout the gesture simulates from.
 */
export type DashboardGestureStartEvent = {
	/** The gripped tile's id. */
	id: string
	/** The canonical layout at the gesture's start — its revert target. */
	layout: DashboardLayoutItem[]
}

/**
 * Payload for the gesture-end brackets (`onDragEnd` / `onResizeEnd`). A
 * cancel — Escape, a drop with nothing to change, a container downgrade
 * mid-gesture — folds in through `canceled` rather than a separate callback,
 * so the two brackets always pair.
 */
export type DashboardGestureEndEvent = {
	/** The gripped tile's id. */
	id: string
	/** Whether the gesture reverted instead of committing. */
	canceled: boolean
	/** The canonical layout after the gesture — the start snapshot when canceled. */
	layout: DashboardLayoutItem[]
}
