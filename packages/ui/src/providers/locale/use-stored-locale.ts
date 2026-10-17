'use client'

import { useSyncExternalStore } from 'react'
import { subscribeChoices } from '../appearance/appearance-storage'
import {
	localeChoice,
	readLocaleChoice,
	resolveLocaleChoice,
	SYSTEM_LOCALE,
	subscribeLocale,
} from './locale-choice'

// The subscription of a provider with no `locales`, which stores no choice.
const subscribeNone = () => () => {}

/**
 * The stored locale choice over `locales`, and the locale that it resolves to.
 * The server render and the hydration render resolve to `fallback`, and then
 * the stored choice applies. Thus a stored choice never causes a hydration
 * mismatch. With no `locales`, the hook reads no storage and resolves to
 * `fallback`.
 *
 * @internal
 */
export function useStoredLocale(
	locales: readonly string[] | undefined,
	fallback: string | undefined,
) {
	const choice = localeChoice(locales ?? [])

	const stored = useSyncExternalStore(
		locales ? subscribeChoices : subscribeNone,
		() => (locales ? readLocaleChoice(choice) : SYSTEM_LOCALE),
		() => SYSTEM_LOCALE,
	)

	const locale = useSyncExternalStore(
		locales ? subscribeLocale : subscribeNone,
		() =>
			locales && fallback !== undefined ? resolveLocaleChoice(choice, locales, fallback) : fallback,
		() => fallback,
	)

	return { choice: stored, locale }
}
