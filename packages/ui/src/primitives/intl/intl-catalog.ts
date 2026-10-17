import {
	createIntl,
	createIntlCache,
	type IntlConfig,
	type IntlShape,
	ReactIntlErrorCode,
} from 'react-intl'
import { languageOf } from './intl-language'
import es from './lang/es.json'

// The language of each default message in the source.
const SOURCE_LANGUAGE = 'en'

// The translated messages of ui, keyed by language subtag. English has no entry,
// because the default message of each descriptor is English.
const catalogs: Record<string, Record<string, string>> = { es }

// One cache for each intl, so the formatters of a locale are built one time.
const cache = createIntlCache()

// One intl for each locale, so a nested provider in the same locale gives the
// same object, and its subtree does not render again.
const intls = new Map<string, IntlShape>()

// A message with no translation shows its English default. The catalog of a
// language can thus grow step by step. Each other error is a defect in a message.
const onError: IntlConfig['onError'] = (error) => {
	if (error.code === ReactIntlErrorCode.MISSING_TRANSLATION) return

	if (process.env.NODE_ENV !== 'production') console.error(error)
}

/**
 * The intl of `locale`, with the messages of its language. A language with no
 * catalog shows the English defaults. Each call with the same locale gives the
 * same object.
 *
 * @internal
 */
export function createLocaleIntl(locale: string): IntlShape {
	const known = intls.get(locale)

	if (known) return known

	// An English locale is the default locale of its own messages. Otherwise
	// `react-intl` builds a missing-translation error for each default message.
	const defaultLocale = languageOf(locale) === SOURCE_LANGUAGE ? locale : SOURCE_LANGUAGE

	const intl = createIntl(
		{ locale, defaultLocale, messages: catalogs[languageOf(locale)] ?? {}, onError },
		cache,
	)

	intls.set(locale, intl)

	return intl
}

/**
 * The intl of a tree with no `LocaleProvider`. It shows the English default of
 * each message.
 *
 * @internal
 */
export const englishIntl = createLocaleIntl(SOURCE_LANGUAGE)
