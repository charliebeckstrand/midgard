import type { GridPinningState } from './grid-data-types'
import type { GridColumn } from './types'

/** A column's frozen edge once normalized (`true` collapses to `'left'`). @internal */
export type PinSide = 'left' | 'right'

/**
 * Runtime pin changes keyed by stringified column id, layered over the static
 * {@link GridColumn.pinned} flags: a side pins the column, `'none'` unpins a
 * statically-pinned one. The header menu and column manager write here — through
 * the `pinning` binding's state — so a column can be frozen or released without
 * touching the column definitions.
 *
 * @internal
 */
export type PinOverrides = Map<string, PinSide | 'none'>

/**
 * Materializes the `pinning` binding's serializable state into the
 * {@link PinOverrides} map the column overlay reads, dropping malformed
 * entries so a persisted value can be trusted as-is.
 *
 * @internal
 */
export function toPinOverrides(state: GridPinningState | undefined): PinOverrides {
	const overrides: PinOverrides = new Map()

	if (!state) return overrides

	for (const [id, side] of Object.entries(state)) {
		if (side === 'left' || side === 'right' || side === 'none') overrides.set(id, side)
	}

	return overrides
}

/**
 * A column's frozen edge from a `pinned` / `locked` flag, normalized: `'right'`
 * stays right, any other truthy value collapses to `'left'`, and an absent flag
 * is `undefined`.
 *
 * @internal
 */
export function normalizeFreeze(flag: boolean | 'left' | 'right' | undefined): PinSide | undefined {
	if (flag === 'right') return 'right'

	return flag ? 'left' : undefined
}

/**
 * Whether a column is locked — frozen by {@link GridColumn.locked}, which the
 * user can't change. A locked column shows no unpin affordance in the header,
 * the context menu, or the column manager.
 *
 * @internal
 */
export function isLocked<T>(column: GridColumn<T>): boolean {
	return normalizeFreeze(column.locked) !== undefined
}

/**
 * A column's effective frozen edge: its {@link GridColumn.locked} side when
 * locked (the immutable freeze), else its {@link GridColumn.pinned} side (the
 * one the header menu and column manager move). `undefined` when the column
 * scrolls. This is the single resolution the engine, the column slice, the
 * header, and the menus all read.
 *
 * @internal
 */
export function frozenSide<T>(column: GridColumn<T>): PinSide | undefined {
	return normalizeFreeze(column.locked) ?? normalizeFreeze(column.pinned)
}

/** Whether a column is frozen to an edge — by either a `pinned` or a `locked` flag. @internal */
export function isFrozen<T>(column: GridColumn<T>): boolean {
	return frozenSide(column) !== undefined
}

/**
 * Overlays the menu's {@link PinOverrides} onto each column's static `pinned`
 * flag, cloning only the columns an override touches — and returning the input
 * array untouched when there are none — so unrelated columns keep their identity
 * (and the downstream `visibleColumns` reference reuse holds). A locked column is
 * skipped: its freeze is immutable, so an override never alters it.
 *
 * @internal
 */
export function applyPinOverrides<T>(
	columns: GridColumn<T>[],
	overrides: PinOverrides,
): GridColumn<T>[] {
	if (overrides.size === 0) return columns

	return columns.map((col) => {
		const override = overrides.get(String(col.id))

		if (override === undefined || isLocked(col)) return col

		return { ...col, pinned: override === 'none' ? undefined : override }
	})
}
