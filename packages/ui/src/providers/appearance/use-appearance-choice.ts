'use client'

import { useCallback, useSyncExternalStore } from 'react'
import {
	type AppearanceChoice,
	readChoice,
	subscribeChoices,
	writeChoice,
} from './appearance-storage'

/**
 * One persisted appearance choice. The server render and the hydration render
 * use the fallback of the choice, then the stored value replaces it. Thus a
 * stored choice never causes a hydration mismatch.
 *
 * @internal
 */
export function useAppearanceChoice<T extends string>(choice: AppearanceChoice<T>) {
	const value = useSyncExternalStore(
		subscribeChoices,
		() => readChoice(choice),
		() => choice.fallback,
	)

	const { key } = choice

	const setValue = useCallback((next: T) => writeChoice(key, next), [key])

	return [value, setValue] as const
}
