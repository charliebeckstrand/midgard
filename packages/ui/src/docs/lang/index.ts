// `pnpm intl` writes this module from the translations in this folder.

/** The language subtag of each translation, in name order. */
export const languages = ['es'] as const

/** The loader of the messages of each translation, by language subtag. */
export const translations = {
	es: () => import('./es.json'),
}
