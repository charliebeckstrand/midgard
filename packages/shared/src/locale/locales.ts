import { CATALOG_LOCALES } from 'ui/providers/locale'

/**
 * The locale of each app: English, the first locale of {@link CATALOG_LOCALES}.
 * The text of each app is English, so the reader cannot choose a locale. The
 * tag is a language with no region, so the formats take the default region of
 * the language, the United States.
 */
export const DEFAULT_LOCALE = CATALOG_LOCALES[0]
