import { createIntl, type IntlConfig, IntlErrorCode, type IntlShape } from '@formatjs/intl'
import { getOrCompute } from '../../utilities/get-or-compute'
import { getLanguage, SOURCE_LANGUAGE } from './intl-language'
import { translations } from './lang'
import type { IntlCatalogLoader, IntlCatalogs, IntlMessages } from './types'

/**
 * The translations of ui, keyed by language subtag: the loader of each
 * translation in `lang/`. English has no entry, because the default message of
 * each descriptor is English. A translation loads only when a provider shows
 * its language, so a page in English loads none.
 *
 * @internal
 */
export const uiCatalogs: IntlCatalogs = translations

/**
 * The catalogs of a provider, in order: the catalogs of ui, then the
 * `catalogs` of each enclosing provider, from the outermost. A message of a
 * later set replaces the message with the same id in an earlier set.
 *
 * @internal
 */
export type CatalogChain = readonly IntlCatalogs[]

/**
 * The chain of a tree with no `catalogs`: the catalogs of ui only.
 *
 * @internal
 */
export const uiChain: CatalogChain = [uiCatalogs]

// The chain of each catalog set under each outer chain. The same two give the
// same chain, so the caches below hold across providers.
const chains = new WeakMap<CatalogChain, WeakMap<IntlCatalogs, CatalogChain>>()

// The messages of each loader that loaded, and the load of each loader that
// started. A load that fails leaves the cache (`load`).
const loaded = new WeakMap<IntlCatalogLoader, IntlMessages>()

const loads = new WeakMap<IntlCatalogLoader, Promise<IntlMessages>>()

// The messages of each chain in each language, or their load when a loader of
// the chain had not loaded. A chain keeps its load after it settles, so each
// render of a provider reads `use` in the same way, and `use` reads a load that
// it saw settle with no suspend.
const messagesByChain = new WeakMap<
	CatalogChain,
	Map<string, IntlMessages | Promise<IntlMessages>>
>()

// The messages of a language with no translation in a chain. Each such chain
// shares it, so they share one intl for each locale.
const NO_MESSAGES: IntlMessages = {}

// One intl for each set of messages and locale, so a nested provider in the
// same locale and with the same catalogs gives the same object, and its
// subtree does not render again.
const intls = new WeakMap<IntlMessages, Map<string, IntlShape>>()

// A message with no translation shows its English default. The catalog of a
// language can thus grow step by step. Each other error is a defect in a message.
const onError: IntlConfig['onError'] = (error) => {
	if (error.code === IntlErrorCode.MISSING_TRANSLATION) return

	if (process.env.NODE_ENV !== 'production') console.error(error)
}

/**
 * `outer` with `catalogs` after its sets. Each call with the same two objects
 * gives the same object.
 *
 * @internal
 */
export function extendChain(outer: CatalogChain, catalogs: IntlCatalogs): CatalogChain {
	const byCatalogs = getOrCompute(chains, outer, () => new WeakMap<IntlCatalogs, CatalogChain>())

	return getOrCompute(byCatalogs, catalogs, () => [...outer, catalogs])
}

function isLoader(source: IntlMessages | IntlCatalogLoader): source is IntlCatalogLoader {
	return typeof source === 'function'
}

// The load of the messages of `loader`. Each call with the same loader gives
// the same promise until the load fails. A load that fails, such as the load of
// a chunk that a deploy removed, gives no messages, so the language shows the
// English defaults and the page does not break. The chain that saw the failure
// keeps that result, so its provider does not load again at each render. A
// provider with a new chain, or the next page load, tries again.
function load(loader: IntlCatalogLoader): Promise<IntlMessages> {
	return getOrCompute(loads, loader, () =>
		loader().then(
			(module) => {
				loaded.set(loader, module.default)

				return module.default
			},
			(error: unknown) => {
				loads.delete(loader)

				if (process.env.NODE_ENV !== 'production') console.error(error)

				return NO_MESSAGES
			},
		),
	)
}

/**
 * The messages of `language` in `chain`, each set merged over the sets before
 * it. When a set of the language is a loader that has not loaded, it gives the
 * load of the messages instead: the load starts each such loader, and it
 * resolves to the merged messages. Each call with the same chain and language
 * gives the same object, or the same load.
 *
 * @internal
 */
export function chainMessages(
	chain: CatalogChain,
	language: string,
): IntlMessages | Promise<IntlMessages> {
	const byLanguage = getOrCompute(
		messagesByChain,
		chain,
		() => new Map<string, IntlMessages | Promise<IntlMessages>>(),
	)

	const held = byLanguage.get(language)

	if (held) return held

	const sources: (IntlMessages | IntlCatalogLoader)[] = []

	for (const catalogs of chain) {
		const source = catalogs[language]

		if (source !== undefined) sources.push(source)
	}

	const waiting = sources.filter(
		(source): source is IntlCatalogLoader => isLoader(source) && !loaded.has(source),
	)

	if (waiting.length === 0) {
		const merged = mergeSources(sources)

		byLanguage.set(language, merged)

		return merged
	}

	const messagesLoad = Promise.all(waiting.map(load)).then(() => mergeSources(sources))

	byLanguage.set(language, messagesLoad)

	return messagesLoad
}

// The messages of each source, merged in order. A loader that failed gives no
// messages.
function mergeSources(sources: readonly (IntlMessages | IntlCatalogLoader)[]): IntlMessages {
	const messages = sources.map((source) =>
		isLoader(source) ? (loaded.get(source) ?? NO_MESSAGES) : source,
	)

	if (messages.length === 0) return NO_MESSAGES

	if (messages.length === 1) return messages[0] ?? NO_MESSAGES

	return Object.assign({}, ...messages)
}

/**
 * Loads the messages of the language of `locale` in `chain`, as a provider in
 * `locale` shows them. A provider that first renders after the load reads
 * them at once, with no suspend.
 *
 * @internal
 */
export async function loadMessages(chain: CatalogChain, locale: string): Promise<IntlMessages> {
	const language = getLanguage(locale)

	const loaders = chain.flatMap((catalogs) => {
		const source = catalogs[language]

		return source !== undefined && isLoader(source) ? [source] : []
	})

	await Promise.all(loaders.map(load))

	return chainMessages(chain, language)
}

/**
 * The intl of `locale`, with `messages` in the language of the locale. Each
 * call with the same locale and the same messages gives the same object.
 *
 * @internal
 */
export function catalogIntl(locale: string, messages: IntlMessages): IntlShape {
	const byLocale = getOrCompute(intls, messages, () => new Map<string, IntlShape>())

	return getOrCompute(byLocale, locale, (tag) => {
		// An English locale is the default locale of its own messages. Otherwise
		// `createIntl` builds a missing-translation error for each default message.
		const defaultLocale = getLanguage(tag) === SOURCE_LANGUAGE ? tag : SOURCE_LANGUAGE

		return createIntl({ locale: tag, defaultLocale, messages, onError })
	})
}

/**
 * The intl of `locale`, with the messages of its language in the catalogs of
 * ui. Each call with the same locale gives the same object. The translation of
 * the language must have loaded ({@link loadMessages}); English needs no load.
 *
 * @internal
 */
export function localeIntl(locale: string): IntlShape {
	const messages = chainMessages(uiChain, getLanguage(locale))

	if (messages instanceof Promise) {
		throw new Error(`localeIntl: the ${locale} translation of ui has not loaded`)
	}

	return catalogIntl(locale, messages)
}

/**
 * The intl of a tree with no `LocaleProvider`. It shows the English default of
 * each message.
 *
 * @internal
 */
export const intlEn = localeIntl(SOURCE_LANGUAGE)
