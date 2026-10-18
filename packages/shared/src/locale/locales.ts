/**
 * The locales that a reader can choose in the settings of an app. The first is
 * the default: the locale of the static shell, and of the System choice when no
 * language of the reader matches. ui has an English and a Spanish catalog, so
 * the list holds one locale for each: English and Spanish. The text of each app
 * stays English until the app has a catalog of its own.
 *
 * Each tag is a language with no region, so the picker shows the name of the
 * language alone. The formats take the default region of the language: the
 * United States for English, and Spain for Spanish.
 */
export const LOCALES = ['en', 'es'] as const

/** The default locale of an app. */
export const DEFAULT_LOCALE = LOCALES[0]
