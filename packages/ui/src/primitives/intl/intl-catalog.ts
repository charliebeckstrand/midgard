import { createIntl, type IntlConfig, IntlErrorCode, type IntlShape } from '@formatjs/intl'
import { getOrCompute } from '../../utilities/get-or-compute'
import { languageOf } from './intl-language'
import es from './lang/es.json'

// The language of each default message in the source.
const SOURCE_LANGUAGE = 'en'

// The translated messages of ui, keyed by language subtag. English has no entry,
// because the default message of each descriptor is English.
const catalogs: Record<string, Record<string, string>> = { es }

// One intl for each locale, so a nested provider in the same locale gives the
// same object, and its subtree does not render again.
const intls = new Map<string, IntlShape>()

// A message with no translation shows its English default. The catalog of a
// language can thus grow step by step. Each other error is a defect in a message.
const onError: IntlConfig['onError'] = (error) => {
	if (error.code === IntlErrorCode.MISSING_TRANSLATION) return

	if (process.env.NODE_ENV !== 'production') console.error(error)
}

/**
 * The intl of `locale`, with the messages of its language. A language with no
 * catalog shows the English defaults. Each call with the same locale gives the
 * same object.
 *
 * @internal
 */
export function localeIntl(locale: string): IntlShape {
	return getOrCompute(intls, locale, (tag) => {
		// An English locale is the default locale of its own messages. Otherwise
		// `createIntl` builds a missing-translation error for each default message.
		const language = languageOf(tag)

		const defaultLocale = language === SOURCE_LANGUAGE ? tag : SOURCE_LANGUAGE

		return createIntl({ locale: tag, defaultLocale, messages: catalogs[language] ?? {}, onError })
	})
}

/**
 * The intl of a tree with no `LocaleProvider`. It shows the English default of
 * each message.
 *
 * @internal
 */
export const englishIntl = localeIntl(SOURCE_LANGUAGE)
