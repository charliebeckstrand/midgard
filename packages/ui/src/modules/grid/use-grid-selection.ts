'use client'

import { useCallback, useRef } from 'react'
import { type SetValue, useControllable } from '../../hooks'
import { toggleItem } from '../../utilities'
import type { GridSelection } from './grid'

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
 * Owns the controllable selection `Set<key>` and its setter — nothing here
 * depends on the rendered rows, so it sits above the engine, letting the table
 * mirror the selection into its own `state.rowSelection` (see
 * {@link useGridTable}). The `Set` stays the source of truth; the engine is a
 * read-only consumer for its selected-row model.
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
	const allSelected = rowKeys.length > 0 && rowKeys.every((rk) => selection.has(rk))

	const someSelected = rowKeys.some((rk) => selection.has(rk))

	const rowKeysRef = useRef(rowKeys)

	rowKeysRef.current = rowKeys

	const toggleRow = useCallback(
		(key: string | number) => {
			setSelection((prev) => toggleItem(prev ?? EMPTY_SELECTION, key))
		},
		[setSelection],
	)

	const toggleAll = useCallback(() => {
		setSelection((prev) => {
			const keys = rowKeysRef.current

			const current = prev ?? EMPTY_SELECTION

			const every = keys.length > 0 && keys.every((k) => current.has(k))

			return every ? new Set() : new Set(keys)
		})
	}, [setSelection])

	return { toggleRow, toggleAll, allSelected, someSelected }
}

/**
 * Owns the data table's selection: the controllable `Set<key>`, the row/all
 * toggles, and the `allSelected` / `someSelected` flags derived from the current
 * rowKeys. A thin composition of {@link useGridSelectionState} and
 * {@link useGridSelectionActions} — {@link Grid} calls those two directly so the
 * selection state can sit above the engine, but the composed form keeps a single
 * entry point for callers (and tests) that don't need that split.
 *
 * @internal
 */
export function useGridSelection({
	selectionConfig,
	rowKeys,
}: {
	selectionConfig: GridSelection | undefined
	rowKeys: (string | number)[]
}): GridSelectionState & GridSelectionActions {
	const state = useGridSelectionState(selectionConfig)

	const actions = useGridSelectionActions({ ...state, rowKeys })

	return { ...state, ...actions }
}
