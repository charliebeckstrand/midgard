'use client'

import { useMemo } from 'react'
import { useKeyedStore } from '../../hooks/use-keyed-store'
import type { KeyedStore } from '../../utilities'

/** Reads the membership of one selection: a set in `multiple` mode, else an identity check. */
function selectionReader(multiple: boolean) {
	return (selected: unknown): ((value: unknown) => boolean) => {
		if (!multiple) return (value) => value === selected

		// The set is built once for each selection, so a toggle costs O(n + k)
		// and not the O(n·k) of an `includes` scan for each option.
		const set = new Set(Array.isArray(selected) ? selected : [])

		return (value) => set.has(value)
	}
}

/**
 * The `selection` store of an {@link OptionSelectionContext}, for the selected
 * value of the host (an array when `multiple`). The store keeps its identity.
 * A layout effect gives each new selection to the store, and only the options
 * whose state changes render again.
 *
 * @param selected - The selected value: one value, or an array when `multiple`.
 * @param multiple - Whether `selected` is an array of values.
 * @returns The store to pass as `selection`.
 */
export function useOptionSelection(
	selected: unknown,
	multiple: boolean,
): KeyedStore<unknown, boolean> {
	const reader = useMemo(() => selectionReader(multiple), [multiple])

	return useKeyedStore(selected, reader)
}

/**
 * Tells whether a host holds a selection: a non-empty array in `multiple`
 * mode, else a defined value that is not an array.
 *
 * @internal
 */
export function hasSelection(value: unknown, multiple: boolean): boolean {
	return multiple
		? Array.isArray(value) && value.length > 0
		: value !== undefined && !Array.isArray(value)
}
