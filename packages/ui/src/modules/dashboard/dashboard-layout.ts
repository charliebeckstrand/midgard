/**
 * Pure layout engine for the dashboard module: integer-unit collision,
 * gravity-up compaction, and drag displacement over a fixed column count.
 * Framework- and style-free so every rule — items magnet upward, a drag
 * pushes what it lands on, statics never move — is unit-testable in
 * isolation. The algorithms port react-grid-layout v1's battle-tested
 * `compact` / `moveElement` pair (the same math under Grafana's grid),
 * rebuilt immutably: callers hand in cells and get fresh arrays back.
 */

import { clamp } from '../../utilities'

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
	/** A static cell never moves: compaction pins it and drags flow around it. */
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

/** The first cell colliding with `cell`, in array order, or `undefined`. @internal */
function firstCollision(cells: readonly LayoutCell[], cell: LayoutCell): LayoutCell | undefined {
	return cells.find((candidate) => collides(candidate, cell))
}

/**
 * Cells in reading order — top row first, then left to right. Ties compare
 * equal (a stable sort keeps their input order), which keeps the cascade
 * deterministic across engines.
 *
 * @internal
 */
export function sortCells(cells: readonly LayoutCell[]): LayoutCell[] {
	return [...cells].sort((a, b) => a.y - b.y || a.x - b.x)
}

/** The bottom edge of the lowest cell — the first free row. @internal */
export function bottom(cells: readonly LayoutCell[]): number {
	return cells.reduce((edge, cell) => Math.max(edge, cell.y + cell.h), 0)
}

/**
 * A working clone the mutating passes are free to mark: `moved` is the
 * displacement cascade's loop guard, never part of the result.
 *
 * @internal
 */
type WorkingCell = LayoutCell & { moved: boolean }

/** Deep-clones cells into the mutable working shape. @internal */
function toWorking(cells: readonly LayoutCell[]): WorkingCell[] {
	return cells.map((cell) => ({ ...cell, moved: false }))
}

/** Strips the working flag, restoring the public cell shape. @internal */
function fromWorking(cells: readonly WorkingCell[]): LayoutCell[] {
	return cells.map(({ moved: _moved, ...cell }) => cell)
}

/**
 * Shifts `cell` down to `moveToY`, first recursively shoving any later cell
 * it would land on further down. Walks only the cells after `cell` in the
 * sorted pass — reading order guarantees nothing earlier can be below it —
 * and bumps `cell.y` one row before probing so the recursive checks see the
 * impending move rather than the stale position.
 *
 * @internal
 */
function resolveCompactionCollision(
	sorted: WorkingCell[],
	cell: WorkingCell,
	moveToY: number,
): void {
	cell.y += 1

	const index = sorted.indexOf(cell)

	for (let i = index + 1; i < sorted.length; i++) {
		const other = sorted[i]

		if (other === undefined || other.static) continue

		// Sorted by row: once a cell starts below this one's bottom edge, no
		// later cell can collide either.
		if (other.y > cell.y + cell.h) break

		if (collides(cell, other)) resolveCompactionCollision(sorted, other, moveToY + cell.h)
	}

	cell.y = moveToY
}

/**
 * Gravity: every movable cell rises until it rests on the top edge, a
 * static, or a cell already placed. Cells settle in reading order against
 * the already-settled set — statics pre-seeded so everything flows around
 * them — which is what makes removal self-healing: compact the survivors
 * and whatever sat below a removed tile slides up into its room. A `y`
 * beyond the current bottom edge (an auto-slotted append) is first pulled
 * back to it, so `Infinity` reads as "after everything".
 *
 * @internal
 */
export function compactUp(cells: readonly LayoutCell[]): LayoutCell[] {
	const sorted = toWorking(sortCells(cells))

	const settled: WorkingCell[] = sorted.filter((cell) => cell.static)

	for (const cell of sorted) {
		if (cell.static) continue

		cell.y = Math.min(bottom(settled), cell.y)

		while (cell.y > 0) {
			const probe = { ...cell, y: cell.y - 1 }

			if (firstCollision(settled, probe)) break

			cell.y -= 1
		}

		// Risen onto an occupied box (a widened or appended cell can land on
		// one): push below it, shoving later cells out of the way first.
		let hit = firstCollision(settled, cell)

		while (hit) {
			resolveCompactionCollision(sorted, cell, hit.y + hit.h)

			hit = firstCollision(settled, cell)
		}

		cell.y = Math.max(cell.y, 0)

		cell.x = Math.max(cell.x, 0)

		settled.push(cell)
	}

	const byId = new Map(sorted.map((cell) => [cell.id, cell]))

	return fromWorking(cells.map((cell) => byId.get(cell.id) ?? { ...cell, moved: false }))
}

/**
 * Moves one cell to a target position, displacing whatever it lands on —
 * the live-preview verb behind a drag. Collisions resolve nearest-first
 * (the sort reverses when the move points up, so the closest neighbour is
 * still handled first), each displaced cell pushing down one row and
 * cascading. Only the user's own move — recursion depth zero — may resolve
 * upward by hopping a displaced cell above the dragged one; cascades always
 * push down, which is what keeps a drag from oscillating into surprise
 * swaps. Colliding with a static reverses the roles: the static holds and
 * the moving cell is displaced instead, reverting outright when there is
 * no room. Returns a fresh array in the input's order; the target missing
 * or static returns the input unchanged.
 *
 * @internal
 */
/** Options for {@link moveElement}. @internal */
export type MoveElementOptions = {
	/**
	 * Whether the first displaced cell may hop over the moved one into clear
	 * room above — the pass-through feel of a free drag. An explicit insert
	 * (the intent bands) turns it off: "open a gap above this tile" must move
	 * that tile softly downward, never teleport it past the drop.
	 * @defaultValue true
	 */
	hop?: boolean
}

export function moveElement(
	cells: readonly LayoutCell[],
	id: string,
	toX: number,
	toY: number,
	columns: number,
	{ hop = true }: MoveElementOptions = {},
): LayoutCell[] {
	const working = toWorking(cells)

	const target = working.find((cell) => cell.id === id)

	if (target === undefined || target.static) return cells.map((cell) => ({ ...cell }))

	moveCell(working, target, clamp(toX, 0, columns - target.w), Math.max(0, toY), hop, false)

	return fromWorking(working)
}

/**
 * The mutating move at the heart of {@link moveElement}: places `cell` and
 * displaces collisions, recursing through {@link moveCellAway}. Returns
 * whether the move held — under `preventCollision` (pushed into a static's
 * box) it reverts and reports `false`.
 *
 * @internal
 */
function moveCell(
	working: WorkingCell[],
	cell: WorkingCell,
	toX: number,
	toY: number,
	userAction: boolean,
	preventCollision: boolean,
): boolean {
	if (cell.x === toX && cell.y === toY) return true

	const fromX = cell.x

	const fromY = cell.y

	const movingUp = toY < fromY

	cell.x = toX

	cell.y = toY

	cell.moved = true

	// Nearest collision first: reading order when pushing down, reversed when
	// the move points up, so displacement starts at the adjacent neighbour.
	let sorted = sortCells(working) as WorkingCell[]

	if (movingUp) sorted = sorted.reverse()

	const collisions = sorted.filter((other) => collides(cell, other))

	if (preventCollision && collisions.length > 0) {
		cell.x = fromX

		cell.y = fromY

		cell.moved = false

		return false
	}

	for (const other of collisions) {
		// The ping-pong guard: a cell this pass already displaced never
		// displaces back, which is the only thing standing between a cascade
		// and an infinite loop.
		if (other.moved) continue

		if (other.static) {
			moveCellAway(working, other, cell, userAction)
		} else {
			moveCellAway(working, cell, other, userAction)
		}
	}

	return true
}

/**
 * Displaces `cellToMove` out of `obstruction`'s box. At recursion depth
 * zero (`userAction`) it may hop the displaced cell above the obstruction
 * when clear room exists there; every deeper cascade only pushes down one
 * row at a time. Pushing a cell into a static propagates `preventCollision`
 * so the shove reverts rather than overlapping the immovable.
 *
 * @internal
 */
function moveCellAway(
	working: WorkingCell[],
	obstruction: WorkingCell,
	cellToMove: WorkingCell,
	userAction: boolean,
): void {
	const preventCollision = obstruction.static

	if (userAction) {
		const above: WorkingCell = {
			...cellToMove,
			id: '__probe__',
			y: Math.max(obstruction.y - cellToMove.h, 0),
			moved: false,
		}

		if (firstCollision(working, above) === undefined) {
			moveCell(working, cellToMove, cellToMove.x, above.y, false, preventCollision)

			return
		}
	}

	moveCell(working, cellToMove, cellToMove.x, cellToMove.y + 1, false, preventCollision)
}

/**
 * Exchanges two cells' origins — each keeps its own span, so unequal sizes
 * swap gracefully and the follow-up compaction absorbs any overlap the size
 * difference leaves. Either id missing or static returns the input
 * unchanged; the caller compacts the result.
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
 * Appends a cell after everything already placed — the auto-slot for an
 * item mounted without a layout entry. The cell lands at the bottom edge;
 * the caller's compaction then pulls it up into whatever room the last row
 * leaves.
 *
 * @internal
 */
export function appendCell(cells: readonly LayoutCell[], cell: LayoutCell): LayoutCell[] {
	return [...cells.map((existing) => ({ ...existing })), { ...cell, y: bottom(cells) }]
}

/**
 * Whether two layouts place every cell identically, id by id — the
 * did-anything-move check behind the responsive identity flag and a
 * gesture's changed-at-all commit gate.
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
