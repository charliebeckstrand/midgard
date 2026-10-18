import { createIntl, type IntlConfig, IntlErrorCode, type IntlShape } from '@formatjs/intl'
import { getOrCompute } from '../../utilities/get-or-compute'
import { languageOf } from './intl-language'
import es from './lang/es.json'
import type { IntlCatalogs } from './types'

// The language of each default message in the source.
const SOURCE_LANGUAGE = 'en'

/**
 * The translated messages of ui, keyed by language subtag. English has no
 * entry, because the default message of each descriptor is English. The
 * catalogs that a `LocaleProvider` takes merge over it.
 *
 * @internal
 */
export const uiCatalogs: IntlCatalogs = { es }

// One intl for each catalog set and locale, so a nested provider in the same
// locale and with the same catalogs gives the same object, and its subtree does
// not render again.
const intls = new WeakMap<IntlCatalogs, Map<string, IntlShape>>()

// The merge of each catalog set over each outer set. The same two sets give the
// same merged object, so the intl cache above holds across providers.
const merges = new WeakMap<IntlCatalogs, WeakMap<IntlCatalogs, IntlCatalogs>>()

// A message with no translation shows its English default. The catalog of a
// language can thus grow step by step. Each other error is a defect in a message.
const onError: IntlConfig['onError'] = (error) => {
	if (error.code === IntlErrorCode.MISSING_TRANSLATION) return

	if (process.env.NODE_ENV !== 'production') console.error(error)
}

/**
 * `inner` merged over `outer`, language by language. A message of `inner`
 * replaces the message with the same id in `outer`. Each call with the same two
 * objects gives the same object.
 *
 * @internal
 */
export function mergeCatalogs(outer: IntlCatalogs, inner: IntlCatalogs): IntlCatalogs {
	const byInner = getOrCompute(merges, outer, () => new WeakMap<IntlCatalogs, IntlCatalogs>())

	return getOrCompute(byInner, inner, () => {
		const merged: Record<string, Readonly<Record<string, string>>> = { ...outer }

		for (const [language, messages] of Object.entries(inner)) {
			merged[language] = { ...outer[language], ...messages }
		}

		return merged
	})
}

/**
 * The intl of `locale`, with the messages of its language in `catalogs`. A
 * language with no catalog shows the English defaults. Each call with the same
 * locale and the same catalogs gives the same object.
 *
 * @internal
 */
export function catalogIntl(locale: string, catalogs: IntlCatalogs): IntlShape {
	const byLocale = getOrCompute(intls, catalogs, () => new Map<string, IntlShape>())

	return getOrCompute(byLocale, locale, (tag) => {
		// An English locale is the default locale of its own messages. Otherwise
		// `createIntl` builds a missing-translation error for each default message.
		const language = languageOf(tag)

		const defaultLocale = language === SOURCE_LANGUAGE ? tag : SOURCE_LANGUAGE

		return createIntl({ locale: tag, defaultLocale, messages: catalogs[language] ?? {}, onError })
	})
}

/**
 * The intl of `locale`, with the messages of its language in the catalogs of
 * ui. Each call with the same locale gives the same object.
 *
 * @internal
 */
export function localeIntl(locale: string): IntlShape {
	return catalogIntl(locale, uiCatalogs)
}

/**
 * The intl of a tree with no `LocaleProvider`. It shows the English default of
 * each message.
 *
 * @internal
 */
export const intlEn = localeIntl(SOURCE_LANGUAGE)

/**
 * The intl of Spanish, with the messages of the Spanish catalog.
 *
 * @internal
 */
export const intlEs = localeIntl('es')
