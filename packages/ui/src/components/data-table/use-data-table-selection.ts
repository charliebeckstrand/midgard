import { useCallback, useRef } from 'react'
import { useControllable } from '../../hooks'
import type { DataTableSelection } from './data-table'

export type UseDataTableSelectionOptions = {
	selectionConfig: DataTableSelection | undefined
	rowKeys: (string | number)[]
}

export type UseDataTableSelectionResult = {
	selection: Set<string | number>
	setSelection: (next: Set<string | number>) => void
	toggleRow: (key: string | number) => void
	toggleAll: () => void
	allSelected: boolean
	someSelected: boolean
}

/**
 * Owns the data table's selection state: the controllable `Set<key>`, the
 * row-toggle and all-toggle actions, and the `allSelected` / `someSelected`
 * flags derived from the current rowKeys. `rowKeys` is mirrored in a ref so
 * `toggleAll` stays stable across selection edits.
 */
export function useDataTableSelection({
	selectionConfig,
	rowKeys,
}: UseDataTableSelectionOptions): UseDataTableSelectionResult {
	const [selectionRaw, setSelectionRaw] = useControllable<Set<string | number>>({
		value: selectionConfig?.value,
		defaultValue: selectionConfig?.defaultValue ?? new Set(),
		onValueChange: selectionConfig?.onValueChange,
	})

	const selection = selectionRaw ?? new Set<string | number>()

	const allSelected =
		rowKeys.length > 0 && rowKeys.every((rk: string | number) => selection.has(rk))

	const someSelected = rowKeys.some((rk: string | number) => selection.has(rk))

	const rowKeysRef = useRef(rowKeys)

	rowKeysRef.current = rowKeys

	const toggleRow = useCallback(
		(key: string | number) => {
			setSelectionRaw((prev) => {
				const next = new Set(prev ?? [])

				if (next.has(key)) next.delete(key)
				else next.add(key)

				return next
			})
		},
		[setSelectionRaw],
	)

	const toggleAll = useCallback(() => {
		setSelectionRaw((prev) => {
			const keys = rowKeysRef.current

			const current = prev ?? new Set<string | number>()

			const every = keys.length > 0 && keys.every((k) => current.has(k))

			return every ? new Set() : new Set(keys)
		})
	}, [setSelectionRaw])

	const setSelection = useCallback(
		(next: Set<string | number>) => {
			setSelectionRaw(next)
		},
		[setSelectionRaw],
	)

	return { selection, setSelection, toggleRow, toggleAll, allSelected, someSelected }
}
