'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import {
	readChoice,
	restoreChoiceCookie,
	type StoredChoice,
	subscribeChoices,
	writeChoice,
} from '../utilities/stored-choice'

/**
 * One stored choice of the reader, such as a choice of appearance. The server render and the hydration render
 * use the fallback of the choice, then the stored value replaces it. Thus a
 * stored choice never causes a hydration mismatch. A choice gets its cookie
 * back from `localStorage` when the cookie is missing.
 *
 * @internal
 */
export function useStoredChoice<T extends string>(choice: StoredChoice<T>) {
	const value = useSyncExternalStore(
		subscribeChoices,
		() => readChoice(choice),
		() => choice.fallback,
	)

	useEffect(() => restoreChoiceCookie(choice), [choice])

	const setValue = useCallback((next: T) => writeChoice(choice, next), [choice])

	return [value, setValue] as const
}
