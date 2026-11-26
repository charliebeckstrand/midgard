import pages from 'virtual:docs/pages'
import type { IntlShape } from 'ui/primitives/intl'
import { sectionLabel } from '../../app/app-messages.ts'
import { pageName, tabName } from '../../kit/names.ts'
import { type Matchable, normalize } from '../engine/index.ts'

/**
 * The section of each page, such as `components`, by its path. The result of
 * a page shows the name of its section and the icon of its section.
 */
export const sectionByPath: ReadonlyMap<string, string> = new Map(
	pages.map((page) => [page.path, page.category]),
)

/** The slug of the tab of a path, the last part before the hash: `/grid/sorting#basic` gives `sorting`. */
function slugOfHref(href: string): string {
	return href.split('#')[0]?.split('/').at(-1) ?? ''
}

/**
 * The entry with its label in the language of the reader. A page keeps its
 * name, and takes its common name as `alias` when the two are not the same
 * words. "Copy button" is the same as `CopyButton`, so it is no alias.
 */
function localizeLabel<T extends Matchable>(intl: IntlShape, option: T): T {
	if (option.kind === 'page') {
		const alias = pageName(intl, option.href, option.label)

		return normalize(alias).replaceAll(' ', '') === normalize(option.label)
			? option
			: { ...option, alias }
	}

	if (option.kind === 'tab') {
		return { ...option, label: tabName(intl, slugOfHref(option.href), option.label) }
	}

	return option
}

/**
 * Where the entry is, in the language of the reader: the section of a page,
 * and the name of a tab, as in "Grid › Sorting". The names from the code stay
 * as they are.
 */
function formatPlace(intl: IntlShape, option: Matchable): string {
	const section = option.kind === 'page' ? sectionByPath.get(option.href) : undefined

	if (section !== undefined) return sectionLabel(intl, section)

	const [page, tab] = option.context.split(' › ')

	return tab === undefined
		? option.context
		: `${page} › ${tabName(intl, slugOfHref(option.href), tab)}`
}

/**
 * The entry as the reader sees it: its label and its place in the language of
 * the reader, and the common name of a page as its `alias`. The query matches
 * the place as well as the English context, so an English word, such as
 * "sorting", finds the same entries in each language.
 */
export function localizeEntry<T extends Matchable>(intl: IntlShape, entry: T): T {
	const named = localizeLabel(intl, entry)

	return { ...named, place: formatPlace(intl, named) }
}
