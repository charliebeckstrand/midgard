/**
 * Content-based responsive derivation for the dashboard module: a pure
 * function from the canonical layout and the container's measured width to
 * the layout actually rendered. There is no breakpoint anywhere — each
 * tile's own minimum content width decides when it can no longer share a
 * row, so a dashboard degrades tile by tile and converges on a full-width
 * stack in reading order. The canonical layout is never written back;
 * editing gestures stand down whenever the derivation is active.
 */

import { compactUp, deriveHeight, type LayoutCell, sameGeometry } from './dashboard-layout'

/**
 * A tile's content demands, registered by its `DashboardItem`: the locked
 * aspect ratio (heights re-derive when the derivation widens the cell) and
 * the minimum pixel width the content stays legible at.
 *
 * @internal
 */
export type CellConstraints = {
	/** Locked `width / height` ratio, or `undefined` for a free-form cell. */
	ratio?: number
	/** Minimum content width in pixels; drives the widen-and-wrap derivation. */
	minWidth?: number
}

/** Options for {@link deriveLayout}. @internal */
export type DeriveLayoutOptions = {
	/** The grid container's measured width in pixels. */
	containerWidth: number
	/** The gutter between tiles in pixels, rendered as a half-gap inset per cell. */
	gap: number
	/** The grid's column count. */
	columns: number
	/** Per-id content demands; ids absent from the map keep their canonical span. */
	constraints: ReadonlyMap<string, CellConstraints>
}

/** What {@link deriveLayout} returns. @internal */
export type DerivedLayout = {
	/** The layout to render, compacted, in the input's order. */
	cells: LayoutCell[]
	/**
	 * Whether the derivation changed nothing — every cell kept its canonical
	 * geometry. Editing gestures are enabled only while `true`, since edits
	 * apply to the canonical layout and must be made against it.
	 */
	identity: boolean
}

/**
 * The narrowest column span whose content box still honours `minWidth`. A
 * cell's content insets half the gap on each side, so the span must cover
 * the demand plus one gap before it divides into columns. Shared with the
 * resize clamp, so a tile can never be dragged narrower than it would
 * responsively widen back to.
 *
 * @internal
 */
export function minColumns(
	minWidth: number,
	gap: number,
	columnPitch: number,
	columns: number,
): number {
	return Math.min(columns, Math.max(1, Math.ceil((minWidth + gap) / columnPitch)))
}

/**
 * Derives the rendered layout from the canonical one: any cell whose
 * content box would fall under its minimum width widens to the span that
 * restores it (shifting left when the wider span no longer fits its
 * column), heights re-derive for ratio-locked cells, and compaction then
 * restacks whatever no longer shares a row. Pure in its inputs — the
 * canonical cells are never mutated — and the identity at any width where
 * every cell already honours its demands, so a wide container renders the
 * canonical layout verbatim.
 *
 * @internal
 */
export function deriveLayout(
	cells: readonly LayoutCell[],
	{ containerWidth, gap, columns, constraints }: DeriveLayoutOptions,
): DerivedLayout {
	// Unmeasured (zero-width) containers derive nothing: render canonical
	// geometry and let the first real measurement decide.
	if (containerWidth <= 0) return { cells: cells.map((cell) => ({ ...cell })), identity: true }

	const columnPitch = containerWidth / columns

	let changed = false

	const widened = cells.map((cell) => {
		const demands = constraints.get(cell.id)

		if (demands?.minWidth === undefined || cell.static) return { ...cell }

		const w = Math.max(cell.w, minColumns(demands.minWidth, gap, columnPitch, columns))

		if (w === cell.w) return { ...cell }

		changed = true

		const x = Math.min(cell.x, columns - w)

		const h = demands.ratio === undefined ? cell.h : deriveHeight(w, demands.ratio)

		return { ...cell, x, w, h }
	})

	if (!changed) return { cells: widened, identity: true }

	const compacted = compactUp(widened)

	return { cells: compacted, identity: sameGeometry(cells, compacted) }
}
