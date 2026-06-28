import type { GridColumn } from './types'

/** A column's frozen edge once normalized (`true` collapses to `'left'`). @internal */
export type PinSide = 'left' | 'right'

/**
 * Runtime pin changes keyed by column id, layered over the static
 * {@link GridColumn.pinned} flags: a side pins the column, `'none'` unpins a
 * statically-pinned one. The header menu writes here so a column can be frozen
 * or released without touching the column definitions.
 *
 * @internal
 */
export type PinOverrides = Map<string | number, PinSide | 'none'>

/**
 * Overlays the menu's {@link PinOverrides} onto each column's static `pinned`
 * flag, cloning only the columns an override touches — and returning the input
 * array untouched when there are none — so unrelated columns keep their identity
 * (and the downstream `visibleColumns` reference reuse holds).
 *
 * @internal
 */
export function applyPinOverrides<T>(
	columns: GridColumn<T>[],
	overrides: PinOverrides,
): GridColumn<T>[] {
	if (overrides.size === 0) return columns

	return columns.map((col) => {
		const override = overrides.get(col.id)

		if (override === undefined) return col

		return { ...col, pinned: override === 'none' ? undefined : override }
	})
}
