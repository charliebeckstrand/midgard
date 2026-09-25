'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { readChoice, subscribeChoices, writeChoice } from './appearance-storage'

/**
 * One persisted appearance choice among `options`, with `fallback` as the
 * default. The server render and the hydration render use `fallback`, then the
 * stored value replaces it. Thus a stored choice never causes a hydration
 * mismatch.
 *
 * @internal
 */
export function useAppearanceChoice<T extends string>(
	key: string,
	options: readonly T[],
	fallback: T,
) {
	const value = useSyncExternalStore(
		subscribeChoices,
		() => readChoice(key, options, fallback),
		() => fallback,
	)

	const setValue = useCallback((next: T) => writeChoice(key, next), [key])

	return [value, setValue] as const
}
