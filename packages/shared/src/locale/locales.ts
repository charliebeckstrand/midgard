import { CATALOG_LOCALES } from 'ui/providers/locale'

/**
 * The locales that a reader can choose in the settings of an app: one locale
 * for each language that ui has a catalog for ({@link CATALOG_LOCALES}). The
 * first is English, the default: the locale of the static shell, and of the
 * System choice when no language of the reader matches. shared has a catalog
 * for each of the languages, and the catalog test holds the two lists in step.
 * The text of each app stays English until the app has a catalog of its own.
 *
 * Each tag is a language with no region, so the picker shows the name of the
 * language alone. The formats take the default region of the language, such
 * as the United States for English.
 */
export const LOCALES = CATALOG_LOCALES

/** The default locale of an app. */
export const DEFAULT_LOCALE = LOCALES[0]
