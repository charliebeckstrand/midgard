import { languages } from './lang'

// A module of its own, so the server path of the request locale loads no
// catalog. It reads the languages of the catalogs, not their messages.

/**
 * The language of each default message in the source.
 *
 * @internal
 */
export const SOURCE_LANGUAGE = 'en'

/**
 * The locales that ui has the text of: English, then the language of each
 * translation in `lang/`, in name order. Each locale is a language subtag with
 * no region, such as `es`. An app gives this list to the `locales` of its
 * `LocaleProvider`, so the reader can choose each language of ui. A new
 * translation in `lang/` adds its locale to the list.
 */
export const CATALOG_LOCALES: readonly [string, ...string[]] = [SOURCE_LANGUAGE, ...languages]

/**
 * The language subtag of a BCP 47 tag, in lowercase, such as `es` for `es-MX`.
 *
 * @internal
 */
export function getLanguage(tag: string): string {
	return tag.split('-')[0]?.toLowerCase() ?? ''
}
