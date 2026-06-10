'use client'

import { useCallback } from 'react'

/**
 * Wraps a select-like component's `onValueChange` to suppress the "cleared to
 * undefined" event in multi-select mode; multi-select represents no selection
 * as an empty array, not `undefined`.
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
