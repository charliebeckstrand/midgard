'use client'

import { useCallback } from 'react'

/**
 * Wraps a select-like component's `onValueChange` to suppress the "cleared to
 * undefined" event when the component is in multi-select mode — multi-select
 * uses an empty array to represent "no selection", not `undefined`, so the
 * upstream callback should never see `undefined` there.
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
