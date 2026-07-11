/**
 * Content-based responsive projection for the dashboard canvas: a pure
 * function from the canonical layout and the container's measured width to
 * the layout actually painted. There is no breakpoint anywhere — each
 * tile's own registered `minWidth` decides when it can no longer share a
 * row, so a board degrades tile by tile and converges on a full-width
 * stack in reading order. The projection is a view: the canonical layout
 * is never written back, the binding never fires from it, and editing
 * gestures stand down while it is active (edits apply to canonical cells,
 * which are not the ones on screen). At any width where every tile already
 * honours its demand, the projection is the identity and the canonical
 * layout renders verbatim — gaps included.
 */

import { type CellConstraints, minColumns } from './dashboard-constraints'
import { deriveHeight, type LayoutCell } from './dashboard-layout'

/** Options for {@link projectLayout}. @internal */
export type LayoutProjectionOptions = {
	/** The grid container's measured width in px; `0` projects nothing. */
	containerWidth: number
	/** The gutter in px, rendered as a half-gap inset inside each cell. */
	gap: number
	/** The grid's column count. */
	columns: number
	/** Per-id content demands; ids absent from the map keep their canonical span. */
	constraints: ReadonlyMap<string, CellConstraints>
}

/** What {@link projectLayout} returns. @internal */
export type LayoutProjection = {
	/** The layout to paint, in the input's order. */
	cells: LayoutCell[]
	/**
	 * Whether the projection changed nothing — every tile honours its demand
	 * at this width, so the canonical layout renders verbatim. Editing is
	 * live only while `true`: gestures simulate and commit canonical cells,
	 * which must be the cells on screen.
	 */
	identity: boolean
}

/** One packed shelf: its cells in reading order and their projected spans. @internal */
type Shelf = { cells: LayoutCell[]; spans: number[]; used: number }

/**
 * Stretches a shelf to the full column span — leftover columns distributed
 * proportionally to each cell's span, the remainder leftmost — and places
 * its cells left to right at `y`, ratio-locked heights re-deriving at the
 * stretched span. Returns the shelf's height: the tallest cell placed.
 * Stretching keeps a narrow board reading as an intentional layout (a lone
 * wrapped tile takes the whole row) rather than a ragged right edge.
 *
 * @internal
 */
function placeShelf(
	shelf: Shelf,
	y: number,
	columns: number,
	constraints: ReadonlyMap<string, CellConstraints>,
	into: Map<string, LayoutCell>,
): number {
	const spare = columns - shelf.used

	const extras = shelf.spans.map((span) => Math.floor((spare * span) / shelf.used))

	let remainder = spare - extras.reduce((sum, extra) => sum + extra, 0)

	let x = 0

	let height = 0

	shelf.cells.forEach((cell, index) => {
		const w = (shelf.spans[index] ?? cell.w) + (extras[index] ?? 0) + (remainder > 0 ? 1 : 0)

		if (remainder > 0) remainder -= 1

		const ratio = constraints.get(cell.id)?.ratio

		const h = ratio === undefined ? cell.h : deriveHeight(w, ratio)

		into.set(cell.id, { ...cell, x, y, w, h })

		x += w

		height = Math.max(height, h)
	})

	return height
}

/**
 * Projects the canonical layout onto a container it may be too narrow for.
 * Each cell's projected span is its canonical one, floored by the columns
 * its registered `minWidth` demands at this width ({@link minColumns} — the
 * same line the resize clamp draws). While no cell is starved the
 * projection is the identity and the canonical layout paints verbatim.
 * Once any is, the whole board re-packs: cells in reading order (row, then
 * column) fill shelves left to right, a cell that no longer fits starting
 * the next shelf below, and each shelf stretches to the full span. Reading
 * order is never reordered — a narrow board is the wide board's story told
 * one column at a time.
 *
 * A projection overrides placement wholesale, statics included: `static`
 * guards a tile against *gestures*, and gestures are down while a
 * projection is active — pinning a static at its canonical cell while the
 * rest of the board re-packs around it would tear holes in the very stack
 * the projection exists to read cleanly.
 *
 * Pure in its inputs — the canonical cells are never mutated — so equal
 * ratios at equal projected spans still derive byte-identical heights, and
 * every rule here is unit-testable without a container in sight.
 *
 * @internal
 */
export function projectLayout(
	cells: readonly LayoutCell[],
	{ containerWidth, gap, columns, constraints }: LayoutProjectionOptions,
): LayoutProjection {
	// Unmeasured containers project nothing: render canonical geometry and
	// let the first real measurement decide.
	if (containerWidth <= 0) return { cells: cells.map((cell) => ({ ...cell })), identity: true }

	const columnPitch = containerWidth / columns

	const spans = new Map<string, number>()

	let starved = false

	for (const cell of cells) {
		const minWidth = constraints.get(cell.id)?.minWidth

		const w =
			minWidth === undefined
				? cell.w
				: Math.max(cell.w, minColumns(minWidth, gap, columnPitch, columns))

		spans.set(cell.id, w)

		if (w > cell.w) starved = true
	}

	if (!starved) return { cells: cells.map((cell) => ({ ...cell })), identity: true }

	// Reading order: row, then column — the order the wide board is read in.
	const order = [...cells].sort((a, b) => a.y - b.y || a.x - b.x)

	const placed = new Map<string, LayoutCell>()

	let shelf: Shelf = { cells: [], spans: [], used: 0 }

	let y = 0

	for (const cell of order) {
		const span = spans.get(cell.id) ?? cell.w

		if (shelf.used > 0 && shelf.used + span > columns) {
			y += placeShelf(shelf, y, columns, constraints, placed)

			shelf = { cells: [], spans: [], used: 0 }
		}

		shelf.cells.push(cell)

		shelf.spans.push(span)

		shelf.used += span
	}

	if (shelf.used > 0) placeShelf(shelf, y, columns, constraints, placed)

	return {
		cells: cells.map((cell) => placed.get(cell.id) ?? { ...cell }),
		identity: false,
	}
}
