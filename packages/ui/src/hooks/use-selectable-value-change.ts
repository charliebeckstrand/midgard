'use client'

import { useCallback } from 'react'

/**
 * Suppresses the "cleared" event for a select-like component in multi-select
 * mode, where no selection is an empty array rather than a missing value.
 * Single-select passes straight through, reporting a cleared selection as the
 * `null` the value cascade already emits (CONVENTIONS §7.3).
 *
 * @returns A handler that forwards to `onValueChange`, dropping the call when
 * the selection is cleared and `multiple` is true. It keeps its identity while
 * `onValueChange` and `multiple` keep theirs.
 */
export function useSelectableValueChange<T>(
	onValueChange: ((value: T | T[] | null) => void) | undefined,
	multiple: boolean,
): (next: T | T[] | null) => void {
	return useCallback(
		(next: T | T[] | null) => {
			if (next == null && multiple) return

			onValueChange?.(next)
		},
		[onValueChange, multiple],
	)
}
