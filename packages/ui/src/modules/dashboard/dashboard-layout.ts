/**
 * Pure layout core for the dashboard module: a fixed-column grid canvas
 * over integer cells. Tiles sit exactly where they are placed — there is
 * no gravity and no compaction, and the board only ever moves in response
 * to a gesture, never on its own initiative. The mutations are the explicit
 * verbs the editor offers (a whole-cell move into free space, an in-row
 * insertion shift, a cross-row equal-span swap, a clamped resize), each
 * confined to the tiles the gesture names. Framework- and style-free:
 * callers hand in cells and get fresh arrays back, every rule unit-testable
 * in isolation.
 */

/**
 * Sub-rows per column width: row pitch is `columnPitch / ROW_SUBDIVISION`.
 * Finer rows than columns let a ratio-derived height land near its true
 * value — 16:9 is exact at half, third, and sixth widths on 24 columns —
 * while heights stay integers the collision math can trust.
 *
 * @internal
 */
export const ROW_SUBDIVISION = 4

/** Default column count; Grafana's constant, divisible by 2, 3, 4, 6, and 8. @internal */
export const DEFAULT_COLUMNS = 24

/**
 * Fallback span for a cell with no stored height and no ratio: the height a
 * 16:9 tile would derive at a third of a 24-column grid, so an unconfigured
 * tile still lands dashboard-shaped.
 *
 * @internal
 */
export const DEFAULT_CELL_HEIGHT = 18

/** Default column span for an auto-slotted item absent from the layout. @internal */
export const DEFAULT_CELL_WIDTH = 8

/**
 * One tile's resolved geometry in integer grid units — the engine's working
 * shape, with the height always concrete (a ratio-locked item's derived
 * height already applied) and `static` always present.
 *
 * @internal
 */
export type LayoutCell = {
	id: string
	/** Leftmost column, `0`-based. */
	x: number
	/** Top row, `0`-based, unbounded downward. */
	y: number
	/** Column span, at least `1`. */
	w: number
	/** Row span, at least `1`. */
	h: number
	/** A static cell never moves: it neither drags, swaps, nor resizes. */
	static: boolean
}

/**
 * A ratio-locked cell's height: the row span closest to `w` columns at the
 * given `width / height` ratio. Pure in `(w, ratio)`, so equal ratios at
 * equal widths derive byte-identical heights — side-by-side tiles align
 * exactly by construction, never by rounding luck.
 *
 * @internal
 */
export function deriveHeight(w: number, ratio: number): number {
	return Math.max(1, Math.round((ROW_SUBDIVISION * w) / ratio))
}

/** Whether two cells' boxes overlap; a cell never collides with itself. @internal */
export function collides(a: LayoutCell, b: LayoutCell): boolean {
	if (a.id === b.id) return false

	if (a.x + a.w <= b.x || a.x >= b.x + b.w) return false

	if (a.y + a.h <= b.y || a.y >= b.y + b.h) return false

	return true
}

/**
 * Whether a cell placement holds on the canvas: inside the column span,
 * not above the top edge, and clear of every other cell. The whole
 * validity question for a move or a resize — there is no displacement to
 * fall back on.
 *
 * @internal
 */
export function fits(cells: readonly LayoutCell[], cell: LayoutCell, columns: number): boolean {
	if (cell.x < 0 || cell.y < 0 || cell.x + cell.w > columns) return false

	return cells.every((other) => other.id === cell.id || !collides(other, cell))
}

/** The bottom edge of the lowest cell — the first fully open row. @internal */
export function bottom(cells: readonly LayoutCell[]): number {
	return cells.reduce((edge, cell) => Math.max(edge, cell.y + cell.h), 0)
}

/**
 * Exchanges two cells' origins — each keeps its own span. The editor only
 * offers this between equal spans, where the trade is exact by
 * construction; either id missing or static returns the input unchanged.
 *
 * @internal
 */
export function swapCells(cells: readonly LayoutCell[], aId: string, bId: string): LayoutCell[] {
	const a = cells.find((cell) => cell.id === aId)

	const b = cells.find((cell) => cell.id === bId)

	if (a === undefined || b === undefined || a.static || b.static) {
		return cells.map((cell) => ({ ...cell }))
	}

	return cells.map((cell) => {
		if (cell.id === aId) return { ...cell, x: b.x, y: b.y }

		if (cell.id === bId) return { ...cell, x: a.x, y: a.y }

		return { ...cell }
	})
}

/**
 * Insertion-reorders one tile within its row: the moving tile is lifted
 * from its slot and dropped at the target's, and every equal-span tile
 * between them ripples one slot over to close the gap — the sortable feel,
 * where a run of neighbours shifts rather than a single pair trading. Only
 * the row's own equal-span, non-static tiles take part (they share the
 * moving tile's `y`, `w`, and `h`); their origins are the fixed slots, so
 * the row stays exactly as wide as it was and nothing outside it moves.
 * Either id missing or static returns the input unchanged.
 *
 * @internal
 */
export function shiftCells(
	cells: readonly LayoutCell[],
	movingId: string,
	targetId: string,
): LayoutCell[] {
	const moving = cells.find((cell) => cell.id === movingId)

	const target = cells.find((cell) => cell.id === targetId)

	if (moving === undefined || target === undefined || moving.static || target.static) {
		return cells.map((cell) => ({ ...cell }))
	}

	// The row's participating tiles, left to right: the fixed slots the ripple
	// rotates cells through. Equal-span and non-static, so the reorder is exact.
	const row = cells
		.filter(
			(cell) => !cell.static && cell.y === moving.y && cell.w === moving.w && cell.h === moving.h,
		)
		.sort((a, b) => a.x - b.x)

	const from = row.findIndex((cell) => cell.id === movingId)

	const to = row.findIndex((cell) => cell.id === targetId)

	if (from === -1 || to === -1) return cells.map((cell) => ({ ...cell }))

	const slots = row.map((cell) => cell.x)

	const order = [...row]

	const [picked] = order.splice(from, 1)

	if (picked === undefined) return cells.map((cell) => ({ ...cell }))

	order.splice(to, 0, picked)

	// Each tile takes the slot at its new index; tiles outside the moved span
	// land back on their own, so only the run between source and target shifts.
	const relocated = new Map(order.map((cell, index) => [cell.id, slots[index]]))

	return cells.map((cell) => {
		const x = relocated.get(cell.id)

		return x === undefined ? { ...cell } : { ...cell, x }
	})
}

/**
 * Appends a cell in the first fully open row below everything already
 * placed — the auto-slot for an item mounted without a layout entry,
 * collision-free by construction.
 *
 * @internal
 */
export function appendCell(cells: readonly LayoutCell[], cell: LayoutCell): LayoutCell[] {
	return [...cells.map((existing) => ({ ...existing })), { ...cell, y: bottom(cells) }]
}

/**
 * Whether two layouts place every cell identically, id by id — the
 * did-anything-move check behind a gesture's changed-at-all commit gate.
 *
 * @internal
 */
export function sameGeometry(a: readonly LayoutCell[], b: readonly LayoutCell[]): boolean {
	if (a.length !== b.length) return false

	const byId = new Map(b.map((cell) => [cell.id, cell]))

	return a.every((cell) => {
		const other = byId.get(cell.id)

		return (
			other !== undefined &&
			other.x === cell.x &&
			other.y === cell.y &&
			other.w === cell.w &&
			other.h === cell.h
		)
	})
}
