'use client'

import { useRef } from 'react'
import { useControllable } from '../../hooks'
import type { DataTableSelection } from '../data-table'
import type { EditableGridSelectionApi } from './types'

// Stable empty-selection sentinel. Treated as read-only — all updates go through
// `setSelection(new Set(...))`.
const EMPTY_SELECTION = new Set<string | number>()

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
