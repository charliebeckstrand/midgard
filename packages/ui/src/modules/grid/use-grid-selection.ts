'use client'

import { useMemo, useRef } from 'react'
import { type SetValue, useControllable } from '../../hooks/use-controllable'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useStableValue } from '../../hooks/use-stable-value'
import { sameElements } from '../../utilities/same-elements'
import { toggleItem } from '../../utilities/toggle-item'
import type { GridSelection } from './grid-data-types'

/** Stable empty selection default; read-only, replaced wholesale on change. @internal */
const EMPTY_SELECTION: Set<string | number> = new Set()

/** The controllable selection Set and its (updater-capable, stable) setter. @internal */
type GridSelectionState = {
	selection: Set<string | number>
	setSelection: (next: SetValue<Set<string | number>>) => void
}

/** The row-derived selection flags and the toggle actions. @internal */
type GridSelectionActions = {
	/**
	 * Toggles a row. With `span`, it sets each row between the last toggled row
	 * and this one to the new state of this row. A rejected row does nothing.
	 */
	toggleRow: (key: string | number, span?: boolean) => void
	toggleAll: () => void
	allSelected: boolean
	someSelected: boolean
	/** The keys of the shown rows that `rowSelectable` rejects. */
	unselectable: ReadonlySet<string | number>
}

/** The binding fields that the selection state reads. @internal */
type GridSelectionValue = Pick<GridSelection, 'value' | 'defaultValue' | 'onValueChange'>

/** No rows, for a caller of {@link useGridSelection} that gives none. @internal */
const NO_ROWS: readonly never[] = []

/** No row rejected: the set of a grid with no `rowSelectable`. @internal */
const NONE_REJECTED: ReadonlySet<string | number> = new Set()

/** Whether two sets of keys hold the same keys in the same order. @internal */
function sameKeys(a: ReadonlySet<string | number>, b: ReadonlySet<string | number>): boolean {
	return a.size === b.size && sameElements([...a], [...b])
}

/**
 * Sets each key from `from` to `to` in `keys`, both ends included, to `on`. A
 * key that `skip` holds keeps its state. @internal
 */
function setSpan(
	selected: Set<string | number>,
	keys: readonly (string | number)[],
	from: number,
	to: number,
	on: boolean,
	skip: ReadonlySet<string | number>,
): Set<string | number> {
	const next = new Set(selected)

	for (let index = Math.min(from, to); index <= Math.max(from, to); index++) {
		const key = keys[index]

		if (key === undefined || skip.has(key)) continue

		if (on) next.add(key)
		else next.delete(key)
	}

	return next
}

/**
 * Owns the controllable selection `Set<key>` and its setter. Nothing here
 * depends on the rendered rows, so it sits above the engine. An export reads
 * the `Set` to take the selected rows (see {@link useGridTable}). The engine
 * keeps no selection state.
 *
 * @internal
 */
export function useGridSelectionState(config: GridSelectionValue | undefined): GridSelectionState {
	const [selectionRaw, setSelection] = useControllable<Set<string | number>>({
		value: config?.value,
		defaultValue: config?.defaultValue ?? EMPTY_SELECTION,
		onValueChange: (next) => config?.onValueChange?.(next ?? EMPTY_SELECTION),
	})

	return { selection: selectionRaw ?? EMPTY_SELECTION, setSelection }
}

/**
 * Derives the `allSelected` / `someSelected` flags and the row/all toggle
 * actions from the current `rowKeys` (the rendered rows) and their `rows`.
 * Split from {@link useGridSelectionState} because these need the engine's
 * output, which the selection state must precede. The toggles read the newest
 * rows when they run, so they keep their identity across selection edits (the
 * memoized rows don't churn).
 *
 * `rowSelectable` rejects a row: its toggle does nothing, a span and
 * select-all skip it, and `allSelected` counts only the rows that it accepts.
 * A span runs from the last row that a toggle named to the row that it names,
 * over `rowKeys`.
 *
 * @internal
 */
export function useGridSelectionActions<T>({
	selection,
	setSelection,
	rowKeys,
	rows,
	rowSelectable,
}: GridSelectionState & {
	rowKeys: (string | number)[]
	/** The rows of `rowKeys`, in the same order. */
	rows: readonly T[]
	rowSelectable: ((row: T) => boolean) | undefined
}): GridSelectionActions {
	const rejected = useMemo(() => {
		if (!rowSelectable) return NONE_REJECTED

		const keys = new Set<string | number>()

		rows.forEach((row, index) => {
			const key = rowKeys[index]

			if (key !== undefined && !rowSelectable(row)) keys.add(key)
		})

		return keys.size === 0 ? NONE_REJECTED : keys
	}, [rows, rowKeys, rowSelectable])

	// The same keys keep one identity, so an inline `rowSelectable` does not
	// render each row checkbox again on each render of the grid.
	const unselectable = useStableValue(rejected, sameKeys)

	const selectableKeys = useMemo(
		() => (unselectable.size === 0 ? rowKeys : rowKeys.filter((key) => !unselectable.has(key))),
		[rowKeys, unselectable],
	)

	// Both flags re-scan the keys (the full set on an unpaginated grid), so they
	// are memoized to recompute only when the rows or the selection actually
	// change, not on every unrelated GridData render (keystrokes, resize frames).
	// The `selection.size` guard skips the scan in the common empty-selection state.
	const allSelected = useMemo(
		() => selectableKeys.length > 0 && selectableKeys.every((key) => selection.has(key)),
		[selectableKeys, selection],
	)

	const someSelected = useMemo(
		() => selection.size > 0 && rowKeys.some((key) => selection.has(key)),
		[rowKeys, selection],
	)

	// The last row that a toggle named: one end of the next span.
	const anchorRef = useRef<string | number | null>(null)

	const toggleRow = useStableEvent((key: string | number, span = false) => {
		if (unselectable.has(key)) return

		const from = span && anchorRef.current !== null ? rowKeys.indexOf(anchorRef.current) : -1

		const to = rowKeys.indexOf(key)

		anchorRef.current = key

		setSelection((prev) => {
			const selected = prev ?? EMPTY_SELECTION

			if (from === -1 || to === -1) return toggleItem(selected, key)

			return setSpan(selected, rowKeys, from, to, !selected.has(key), unselectable)
		})
	})

	// A selection outlives the page and the filter, so select-all adds the shown
	// rows and deselect-all takes out only the shown rows. A selected row that
	// the view does not show stays selected. A rejected row keeps its state. It
	// reads the newest rows, and its identity holds for the mount.
	const toggleAll = useStableEvent(() => {
		setSelection((prev) => {
			const selected = prev ?? EMPTY_SELECTION

			const every = selectableKeys.length > 0 && selectableKeys.every((key) => selected.has(key))

			const next = new Set(selected)

			for (const key of selectableKeys) {
				if (every) next.delete(key)
				else next.add(key)
			}

			return next
		})
	})

	return { toggleRow, toggleAll, allSelected, someSelected, unselectable }
}

/**
 * Owns the data table's selection: the controllable `Set<key>`, the row/all
 * toggles, and the `allSelected` / `someSelected` flags derived from the current
 * rowKeys. A thin composition of {@link useGridSelectionState} and
 * {@link useGridSelectionActions}, which {@link GridData} calls directly so the
 * selection state can sit above the engine. This composed form is the file's
 * single entry point for callers that don't need that split.
 *
 * @internal
 */
export function useGridSelection<T>({
	selectionConfig,
	rowKeys,
	rows,
}: {
	selectionConfig: GridSelection<T> | undefined
	rowKeys: (string | number)[]
	/** The rows of `rowKeys`, which `rowSelectable` reads. @defaultValue none */
	rows?: readonly T[]
}): GridSelectionState & GridSelectionActions {
	const state = useGridSelectionState(selectionConfig)

	const actions = useGridSelectionActions({
		...state,
		rowKeys,
		rows: rows ?? NO_ROWS,
		rowSelectable: selectionConfig?.rowSelectable,
	})

	return { ...state, ...actions }
}
