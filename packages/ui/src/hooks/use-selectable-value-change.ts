'use client'

import { useCallback } from 'react'

/**
 * Adapts a select-like component's internal value cascade to its public
 * `onValueChange`. Multi-select represents no selection as an empty array, so
 * the internal "cleared to `undefined`" event is dropped there; single-select
 * reports a cleared selection as `null` per CONVENTIONS §7.3 — `undefined`
 * would read as *uncontrolled* if a controlled consumer echoed it back.
 *
 * @returns A stable handler that forwards to `onValueChange`, mapping a cleared
 * single selection to `null` and dropping the call entirely when `multiple`.
 */
export function useSelectableValueChange<T>(
	onValueChange: ((value: T | T[] | null) => void) | undefined,
	multiple: boolean,
): (nextValue: T | T[] | undefined) => void {
	return useCallback(
		(nextValue: T | T[] | undefined) => {
			if (nextValue === undefined && multiple) return

			onValueChange?.(nextValue ?? null)
		},
		[onValueChange, multiple],
	)
}
