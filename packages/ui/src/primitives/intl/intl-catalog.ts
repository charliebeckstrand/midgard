import {
	createIntl,
	createIntlCache,
	type IntlConfig,
	type IntlShape,
	ReactIntlErrorCode,
} from 'react-intl'
import es from './lang/es.json'

// The language of each default message in the source.
const SOURCE_LANGUAGE = 'en'

// The translated messages of ui, keyed by language subtag. English has no entry,
// because the default message of each descriptor is English.
const catalogs: Record<string, Record<string, string>> = { es }

// One cache for each intl, so the formatters of a locale are built one time.
const cache = createIntlCache()

// A message with no translation shows its English default. The catalog of a
// language can thus grow step by step. Each other error is a defect in a message.
const onError: IntlConfig['onError'] = (error) => {
	if (error.code === ReactIntlErrorCode.MISSING_TRANSLATION) return

	if (process.env.NODE_ENV !== 'production') console.error(error)
}

// The language subtag of a BCP 47 tag, such as `es` for `es-MX`.
function languageOf(locale: string) {
	return locale.split('-')[0]?.toLowerCase() ?? SOURCE_LANGUAGE
}

/**
 * Creates the intl of `locale`, with the messages of its language. A language
 * with no catalog shows the English defaults.
 *
 * @internal
 */
export function createLocaleIntl(locale: string): IntlShape {
	return createIntl(
		{
			locale,
			defaultLocale: SOURCE_LANGUAGE,
			messages: catalogs[languageOf(locale)] ?? {},
			onError,
		},
		cache,
	)
}

/**
 * The intl of a tree with no `LocaleProvider`. It shows the English default of
 * each message.
 *
 * @internal
 */
export const englishIntl = createLocaleIntl(SOURCE_LANGUAGE)
