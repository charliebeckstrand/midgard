'use client'

import { useCallback, useMemo } from 'react'
import { type SetValue, useControllable } from '../../hooks'
import { useStableEvent } from '../../hooks/use-stable-event'
import { toggleItem } from '../../utilities'
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
	toggleRow: (key: string | number) => void
	toggleAll: () => void
	allSelected: boolean
	someSelected: boolean
}

/**
 * Owns the controllable selection `Set<key>` and its setter. Nothing here
 * depends on the rendered rows, so it sits above the engine. An export reads
 * the `Set` to take the selected rows (see {@link useGridTable}). The engine
 * keeps no selection state.
 *
 * @internal
 */
export function useGridSelectionState(config: GridSelection | undefined): GridSelectionState {
	const [selectionRaw, setSelection] = useControllable<Set<string | number>>({
		value: config?.value,
		defaultValue: config?.defaultValue ?? EMPTY_SELECTION,
		onValueChange: (next) => config?.onValueChange?.(next ?? EMPTY_SELECTION),
	})

	return { selection: selectionRaw ?? EMPTY_SELECTION, setSelection }
}

/**
 * Derives the `allSelected` / `someSelected` flags and the row/all toggle
 * actions from the current `rowKeys` (the rendered rows). Split from
 * {@link useGridSelectionState} because these need the engine's output, which
 * the selection state must precede. The toggles take the functional-updater
 * form against a `rowKeys` ref, so they stay referentially stable across
 * selection edits (the memoized rows don't churn).
 *
 * @internal
 */
export function useGridSelectionActions({
	selection,
	setSelection,
	rowKeys,
}: GridSelectionState & { rowKeys: (string | number)[] }): GridSelectionActions {
	// Both flags re-scan `rowKeys` (the full set on an unpaginated grid), so they
	// are memoized to recompute only when the rows or the selection actually
	// change — not on every unrelated GridData render (keystrokes, resize frames).
	// The `selection.size` guard skips the scan in the common empty-selection state.
	const allSelected = useMemo(
		() => rowKeys.length > 0 && rowKeys.every((rk) => selection.has(rk)),
		[rowKeys, selection],
	)

	const someSelected = useMemo(
		() => selection.size > 0 && rowKeys.some((rk) => selection.has(rk)),
		[rowKeys, selection],
	)

	const toggleRow = useCallback(
		(key: string | number) => {
			setSelection((prev) => toggleItem(prev ?? EMPTY_SELECTION, key))
		},
		[setSelection],
	)

	// It reads the newest rows, and its identity holds for the mount.
	const toggleAll = useStableEvent(() => {
		setSelection((prev) => {
			const current = prev ?? EMPTY_SELECTION

			const every = rowKeys.length > 0 && rowKeys.every((k) => current.has(k))

			return every ? new Set() : new Set(rowKeys)
		})
	})

	return { toggleRow, toggleAll, allSelected, someSelected }
}
