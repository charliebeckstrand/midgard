'use client'

import { useRef } from 'react'
import { useControllable } from '../../hooks'
import type { GridSelection } from './grid-data-types'
import type { GridEditableSelectionApi } from './grid-editable-types'

// Stable empty-selection sentinel. Treated as read-only; all updates go through
// `setSelection(new Set(...))`.
const EMPTY_SELECTION = new Set<string | number>()

/**
 * Adapts the `Grid` selection config into the grid's selection seam:
 * threads the controllable selection set through `useControllable` and exposes a
 * live `selectionRef` so the mutation path can fan a single-cell write across a
 * multi-row selection at event time.
 *
 * @returns `selection` (current set) / `setSelection` / `selectionApi` (the
 *   ref-backed {@link GridEditableSelectionApi}).
 * @internal
 */
export function useGridEditableSelection(config: GridSelection | undefined) {
	const [selectionRaw, setSelection] = useControllable<Set<string | number>>({
		value: config?.value,
		defaultValue: config?.defaultValue ?? new Set(),
		onValueChange: config?.onValueChange,
	})

	const selection = selectionRaw ?? EMPTY_SELECTION

	const selectionRef = useRef(selection)

	selectionRef.current = selection

	const selectionApi: GridEditableSelectionApi = { selectionRef }

	return { selection, setSelection, selectionApi }
}
