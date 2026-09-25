import type { GridPinningState } from '../../grid-data-types'
import type { GridColumn } from '../../types'

/** A column's frozen edge once normalized (`true` collapses to `'left'`). @internal */
export type PinSide = 'left' | 'right'

/**
 * Runtime pin changes keyed by stringified column id, layered over the static
 * {@link GridColumn.pinned} flags: a side pins the column, `'none'` unpins a
 * statically-pinned one. The header menu and column manager write here, through
 * the `pinning` binding's state. A column can therefore be frozen or released
 * without touching the column definitions.
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
 * A column's frozen edge from a `pinned` / `locked` flag, normalized. A
 * `'right'` flag stays right, any other truthy value collapses to `'left'`, and
 * an absent flag is `undefined`.
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
 * locked, which is the immutable freeze. Otherwise it is its
 * {@link GridColumn.pinned} side, the one the header menu and column manager
 * move. `undefined` when the column
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
 * flag. It clones only the columns an override touches, and returns the input
 * array untouched when there are none. Unrelated columns therefore keep their
 * identity, and the downstream `visibleColumns` reference reuse holds. A locked column is
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

/**
 * A column-manager item's effective frozen edge: its immutable `locked` side,
 * else its movable `pinned` side — or `undefined` when it scrolls. The
 * manager-side counterpart of {@link frozenSide}, whose input is a raw column
 * with un-normalized flags.
 *
 * @internal
 */
export function effectivePinSide(item: {
	pinned?: PinSide
	locked?: PinSide
}): PinSide | undefined {
	return item.locked ?? item.pinned
}

/** One offering of the pin menu: its stable key, display label, and the pin target it commits. @internal */
export type PinMenuChoice = {
	key: 'pin-left' | 'pin-right' | 'unpin'
	label: string
	/** The edge to pin to, or `false` to unpin. */
	target: PinSide | false
}

/**
 * The physical edge that a pin side names in a grid of the given direction. A
 * pin side is logical: `'left'` is the inline start. In a right-to-left grid,
 * the start is the right edge. The menu labels, the arrows, and the
 * announcement name the physical edge, because that is where the column goes.
 *
 * @internal
 */
export function physicalSide(side: PinSide, rtl: boolean): PinSide {
	if (!rtl) return side

	return side === 'left' ? 'right' : 'left'
}

/** The label of a pin choice, from the physical edge. @internal */
const PIN_LABEL: Record<PinSide, string> = { left: 'Pin left', right: 'Pin right' }

/**
 * The pin choices a column's menu offers, from its current frozen edge. They are
 * a pin to each edge it is not already frozen to, and "Unpin" once it is
 * frozen. A scrolling column offers both edges; a left-pinned one offers the
 * right edge and Unpin, and vice versa. The one decision tree behind the
 * header context menu's pin items and the column manager's pin control.
 *
 * The keys and the targets are logical. The labels name the physical edge, so
 * in a right-to-left grid the `'left'` target reads "Pin right".
 *
 * @param rtl - Whether the grid lays out right to left.
 * @internal
 */
export function pinMenuChoices(side: PinSide | undefined, rtl = false): PinMenuChoice[] {
	const choices: PinMenuChoice[] = []

	if (side !== 'left') {
		choices.push({ key: 'pin-left', label: PIN_LABEL[physicalSide('left', rtl)], target: 'left' })
	}

	if (side !== 'right') {
		choices.push({
			key: 'pin-right',
			label: PIN_LABEL[physicalSide('right', rtl)],
			target: 'right',
		})
	}

	if (side) choices.push({ key: 'unpin', label: 'Unpin', target: false })

	return choices
}
