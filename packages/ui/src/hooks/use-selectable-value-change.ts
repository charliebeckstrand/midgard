'use client'

import { useCallback } from 'react'

/**
 * Suppresses the "cleared" event for a select-like component in multi-select
 * mode, where no selection is an empty array rather than a missing value.
 * Single-select passes straight through, reporting a cleared selection as the
 * `null` the value cascade already emits (CONVENTIONS §7.3).
 *
 * @returns A stable handler that forwards to `onValueChange`, dropping the call
 * when the selection is cleared and `multiple` is true.
 */
export function useSelectableValueChange<T>(
	onValueChange: ((value: T | T[] | null) => void) | undefined,
	multiple: boolean,
): (nextValue: T | T[] | null) => void {
	return useCallback(
		(nextValue: T | T[] | null) => {
			if (nextValue == null && multiple) return

			onValueChange?.(nextValue)
		},
		[onValueChange, multiple],
	)
}
