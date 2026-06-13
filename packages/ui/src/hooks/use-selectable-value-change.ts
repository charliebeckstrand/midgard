'use client'

import { useCallback } from 'react'

/**
 * Wraps a select-like component's `onValueChange` to suppress the "cleared to
 * undefined" event in multi-select mode; multi-select represents no selection
 * as an empty array, not `undefined`.
 *
 * @returns A stable handler that forwards to `onValueChange`, dropping the call
 * when the next value is `undefined` and `multiple` is true.
 */
export function useSelectableValueChange<T>(
	onValueChange: ((value: T | T[] | undefined) => void) | undefined,
	multiple: boolean,
): (nextValue: T | T[] | undefined) => void {
	return useCallback(
		(nextValue: T | T[] | undefined) => {
			if (nextValue === undefined && multiple) return

			onValueChange?.(nextValue)
		},
		[onValueChange, multiple],
	)
}
