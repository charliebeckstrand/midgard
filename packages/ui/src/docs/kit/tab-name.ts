import type { IntlShape } from 'ui/primitives/intl'

/**
 * The start of the message id of the name of a tab. The rest of the id is the
 * slug of the tab, such as `docs.tab.sorting`.
 */
export const TAB_ID = 'docs.tab.'

/** The path part of a tab: `Server grouping` gives `server-grouping`. */
export function slugOf(tab: string): string {
	return tab.toLowerCase().replaceAll(' ', '-')
}

/**
 * The name of the tab `slug` in the language of the reader. A page names its
 * tabs in English in its `TABS` constant, so the name has no descriptor in the
 * source. `pnpm intl` writes one entry for each tab in the docs catalog, and
 * the English name is the default.
 *
 * @param slug - The slug of the tab, such as `sorting`.
 * @param name - The English name, such as "Sorting".
 */
export function tabName(intl: IntlShape, slug: string, name: string): string {
	// A variable, not an inline object: the extraction reads each inline
	// descriptor, and this one has no literal id.
	const descriptor = { id: `${TAB_ID}${slug}`, defaultMessage: name }

	return intl.formatMessage(descriptor)
}
