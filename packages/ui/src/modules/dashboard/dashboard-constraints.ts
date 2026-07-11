/**
 * Content demands for the dashboard module: each tile's registered
 * constraints and the pure grid-unit floor they derive. `minWidth` draws
 * one line read from two sides: the resize clamp floors how far a tile may
 * be dragged narrower, and the responsive projection
 * (`dashboard-responsive`) widens and re-packs the board once the container
 * drops any tile under it — so a tile can never be resized narrower than
 * the width it would responsively widen back to.
 */

/**
 * A tile's content demands, registered by its `DashboardItem`: the locked
 * aspect ratio and the minimum pixel width the content stays legible at.
 *
 * @internal
 */
export type CellConstraints = {
	/** Locked `width / height` ratio, or `undefined` for a free-form cell. */
	ratio?: number
	/** Minimum content width in pixels; floors the resize clamp. */
	minWidth?: number
}

/**
 * The narrowest column span whose content box still honours `minWidth`. A
 * cell's content insets half the gap on each side, so the span must cover
 * the demand plus one gap before it divides into columns. Drives the resize
 * clamp, so a tile can never be dragged narrower than its content stays
 * legible at.
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
