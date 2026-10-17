import {
	type AppearanceChoice,
	readChoice,
	subscribeChoices,
	writeChoice,
} from '../appearance/appearance-storage'

/**
 * The stored locale choice that follows the languages of the browser. A reader
 * who has not picked a locale has this choice.
 *
 * @internal
 */
export const SYSTEM_LOCALE = 'system'

// The `localStorage` key of the choice. The choice shares the storage of the
// appearance choices, so a write in another tab arrives here too.
const LOCALE_KEY = 'locale'

/**
 * The locale choice over `locales`: `'system'`, or one of `locales`. A stored
 * value that is not one of them reads as `'system'`.
 *
 * @internal
 */
export function localeChoice(locales: readonly string[]): AppearanceChoice<string> {
	return { key: LOCALE_KEY, values: [SYSTEM_LOCALE, ...locales], fallback: SYSTEM_LOCALE }
}

/**
 * Stores a locale choice and notifies each subscriber in this page.
 *
 * @internal
 */
export function writeLocaleChoice(choice: string) {
	writeChoice(LOCALE_KEY, choice)
}

// The language subtag of a BCP 47 tag, such as `en` for `en-GB`.
function languageOf(tag: string) {
	return tag.split('-')[0]?.toLowerCase()
}

/**
 * Finds the locale of `locales` that matches the languages of the reader. It
 * reads `preferred` in order, and stops at the first language that one of
 * `locales` has. In that language, a tag that the reader also prefers wins.
 * Else the first locale of the language wins. Thus `['en-NZ', 'en-GB']` gives
 * `'en-GB'`, and `['en']` gives the first English locale.
 *
 * @returns The match, or `undefined` when no locale has a preferred language.
 * @internal
 */
export function matchLocale(
	preferred: readonly string[],
	locales: readonly string[],
): string | undefined {
	const exact = (tag: string) =>
		locales.find((locale) => locale.toLowerCase() === tag.toLowerCase())

	for (const tag of preferred) {
		const language = languageOf(tag)

		const sameLanguage = (other: string) => languageOf(other) === language

		const reader = preferred.filter(sameLanguage).find((other) => exact(other) !== undefined)

		const match = reader === undefined ? locales.find(sameLanguage) : exact(reader)

		if (match !== undefined) return match
	}

	return undefined
}

/**
 * Resolves the stored choice of `choice` to a locale tag. A stored locale is
 * the result. `'system'` takes the match of the languages of the browser, else
 * `fallback`. It reads `navigator`, so call it in the browser only.
 *
 * @internal
 */
export function resolveLocaleChoice(
	choice: AppearanceChoice<string>,
	locales: readonly string[],
	fallback: string,
): string {
	const stored = readChoice(choice)

	if (stored !== SYSTEM_LOCALE) return stored

	return matchLocale(navigator.languages, locales) ?? fallback
}

/**
 * Subscribes to each change that can change the resolved locale: a write of a
 * choice, a write in another tab, and a change to the languages of the browser.
 *
 * @internal
 */
export function subscribeLocale(listener: () => void) {
	const unsubscribe = subscribeChoices(listener)

	window.addEventListener('languagechange', listener)

	return () => {
		unsubscribe()

		window.removeEventListener('languagechange', listener)
	}
}

// The name of a locale in its own language, such as `English (United Kingdom)`
// for `en-GB`. The `standard` display keeps the region in parentheses, so each
// option has the same form.
function localeName(locale: string) {
	return (
		new Intl.DisplayNames([locale], { type: 'language', languageDisplay: 'standard' }).of(locale) ??
		locale
	)
}

/**
 * The options of a locale picker: System, then each locale under its name in
 * its own language.
 *
 * @internal
 */
export function localeOptions(locales: readonly string[]): { label: string; value: string }[] {
	return [
		{ label: 'System', value: SYSTEM_LOCALE },
		...locales.map((locale) => ({ label: localeName(locale), value: locale })),
	]
}
