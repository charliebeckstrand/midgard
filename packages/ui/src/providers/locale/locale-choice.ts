import { languageOf } from '../../primitives/intl/intl-language'
import {
	type AppearanceChoice,
	parseChoice,
	readChoice,
	subscribeChoices,
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
 * The name of the cookie that holds the locale choice of the reader: `'system'`,
 * or a locale tag. The provider writes it, so a server that renders per request
 * can read the choice with {@link resolveRequestLocale}.
 */
export const LOCALE_COOKIE = 'locale'

/**
 * The locale choice over `locales`: `'system'`, or one of `locales`. A stored
 * value that is not one of them reads as `'system'`. The choice has the cookie
 * {@link LOCALE_COOKIE}, so the server and the browser read the same choice.
 *
 * @internal
 */
export function localeChoice(locales: readonly string[]): AppearanceChoice<string> {
	return {
		key: LOCALE_KEY,
		values: [SYSTEM_LOCALE, ...locales],
		fallback: SYSTEM_LOCALE,
		cookie: LOCALE_COOKIE,
	}
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

// The tags of an `Accept-Language` header, in the order of their weight. A tag
// with no weight has the weight 1, and `*` matches no locale. The sort is
// stable, so tags of the same weight keep the order of the header.
function acceptedLanguages(header: string) {
	return header
		.split(',')
		.map((part) => {
			const [tag = '', ...params] = part.split(';').map((piece) => piece.trim())

			const weight = params.find((param) => param.startsWith('q='))

			return { tag, q: weight ? Number(weight.slice(2)) : 1 }
		})
		.filter(({ tag, q }) => tag !== '' && tag !== '*' && q > 0)
		.sort((a, b) => b.q - a.q)
		.map(({ tag }) => tag)
}

// The one rule of the server and the browser: a stored choice that is one of
// `locales` wins, else the match of the languages of the reader, else `fallback`.
function pickLocale(
	choice: string,
	preferred: readonly string[],
	locales: readonly string[],
	fallback: string,
): string {
	if (locales.includes(choice)) return choice

	return matchLocale(preferred, locales) ?? fallback
}

/** The request values that {@link resolveRequestLocale} reads. */
export type RequestLocaleInput = {
	/** The value of the {@link LOCALE_COOKIE} cookie, if the request has one. */
	cookie?: string
	/** The `Accept-Language` header of the request, if it has one. */
	acceptLanguage?: string | null
	/** The locales that the reader can choose from, as the provider gets them. */
	locales: readonly [string, ...string[]]
}

/**
 * Resolves the locale of a request on the server, as the provider resolves it
 * in the browser. A cookie that holds one of `locales` gives that locale. Else
 * the choice is System, and the `Accept-Language` header takes the place of the
 * languages of the browser.
 *
 * @returns The locale, else the first entry of `locales`.
 * @example
 * ```ts
 * const locale = resolveRequestLocale({
 *   cookie: (await cookies()).get(LOCALE_COOKIE)?.value,
 *   acceptLanguage: (await headers()).get('accept-language'),
 *   locales: ['en-US', 'es-ES'],
 * })
 * ```
 */
export function resolveRequestLocale({
	cookie,
	acceptLanguage,
	locales,
}: RequestLocaleInput): string {
	const preferred = acceptLanguage ? acceptedLanguages(acceptLanguage) : []

	return pickLocale(parseChoice(localeChoice(locales), cookie), preferred, locales, locales[0])
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
	return pickLocale(readChoice(choice), navigator.languages, locales, fallback)
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
 * The options of a locale picker: System under `systemLabel`, then each locale
 * under its name in its own language.
 *
 * @internal
 */
export function localeOptions(
	locales: readonly string[],
	systemLabel: string,
): { label: string; value: string }[] {
	return [
		{ label: systemLabel, value: SYSTEM_LOCALE },
		...locales.map((locale) => ({ label: localeName(locale), value: locale })),
	]
}
