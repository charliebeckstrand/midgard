/**
 * The locales that a reader can choose in the settings of an app. The first is
 * the default: the locale of the static shell, and of the System choice when no
 * language of the reader matches. ui has an English and a Spanish catalog, so
 * the list holds English and Spanish locales. The text of each app stays
 * English until the app has a catalog of its own.
 */
export const LOCALES = ['en-US', 'en-GB', 'en-CA', 'en-AU', 'es-ES', 'es-MX'] as const

/** The default locale of an app. */
export const DEFAULT_LOCALE = LOCALES[0]
