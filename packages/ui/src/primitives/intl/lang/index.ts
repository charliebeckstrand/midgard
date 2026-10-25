// `pnpm intl` writes this module from the translations in this folder.

import es from './es.json'

/** The language subtag of each translation, in name order. */
export const languages = ['es'] as const

/** The messages of each translation, by language subtag. */
export const translations = {
	es,
}
