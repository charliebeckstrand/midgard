'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import {
	type AppearanceChoice,
	readChoice,
	restoreChoiceCookie,
	subscribeChoices,
	writeChoice,
} from './appearance-storage'

/**
 * One persisted appearance choice. The server render and the hydration render
 * use the fallback of the choice, then the stored value replaces it. Thus a
 * stored choice never causes a hydration mismatch. A choice with a cookie gets
 * its cookie back from `localStorage` when the cookie is missing.
 *
 * @internal
 */
export function useAppearanceChoice<T extends string>(choice: AppearanceChoice<T>) {
	const value = useSyncExternalStore(
		subscribeChoices,
		() => readChoice(choice),
		() => choice.fallback,
	)

	useEffect(() => restoreChoiceCookie(choice), [choice])

	const setValue = useCallback((next: T) => writeChoice(choice, next), [choice])

	return [value, setValue] as const
}
