'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { noopSubscribe } from '../../utilities'
import { readChoice, restoreChoiceCookie, subscribeChoices } from '../appearance/appearance-storage'
import { localeChoice, resolveLocaleChoice, SYSTEM_LOCALE, subscribeLocale } from './locale-choice'

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
		locales ? subscribeChoices : noopSubscribe,
		() => (locales ? readChoice(choice) : SYSTEM_LOCALE),
		() => SYSTEM_LOCALE,
	)

	const locale = useSyncExternalStore(
		locales ? subscribeLocale : noopSubscribe,
		() =>
			locales && fallback !== undefined ? resolveLocaleChoice(choice, locales, fallback) : fallback,
		() => fallback,
	)

	useEffect(() => {
		if (locales) restoreChoiceCookie(localeChoice(locales))
	}, [locales])

	return { choice: stored, locale }
}
