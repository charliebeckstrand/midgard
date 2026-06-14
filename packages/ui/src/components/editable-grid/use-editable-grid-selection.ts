'use client'

import { useRef } from 'react'
import { useControllable } from '../../hooks'
import type { DataTableSelection } from '../data-table'
import type { EditableGridSelectionApi } from './types'

// Stable empty-selection sentinel. Treated as read-only; all updates go through
// `setSelection(new Set(...))`.
const EMPTY_SELECTION = new Set<string | number>()

/**
 * Adapts the `DataTable` selection config into the grid's selection seam:
 * threads the controllable selection set through `useControllable` and exposes a
 * live `selectionRef` so the mutation path can fan a single-cell write across a
 * multi-row selection at event time.
 *
 * @returns `selection` (current set) / `setSelection` / `selectionApi` (the
 *   ref-backed {@link EditableGridSelectionApi}).
 * @internal
 */
export function useEditableGridSelection(config: DataTableSelection | undefined) {
	const [selectionRaw, setSelection] = useControllable<Set<string | number>>({
		value: config?.value,
		defaultValue: config?.defaultValue ?? new Set(),
		onValueChange: config?.onValueChange,
	})

	const selection = selectionRaw ?? EMPTY_SELECTION

	const selectionRef = useRef(selection)

	selectionRef.current = selection

	const selectionApi: EditableGridSelectionApi = { selectionRef }

	return { selection, setSelection, selectionApi }
}
