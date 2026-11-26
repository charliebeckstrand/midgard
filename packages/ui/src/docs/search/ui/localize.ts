import pages from 'virtual:docs/pages'
import type { IntlShape } from 'ui/primitives/intl'
import { sectionLabel } from '../../app/app-messages.ts'
import { exampleTitle, pageName, tabName } from '../../kit/names.ts'
import type { Matchable } from '../engine/index.ts'

// The section of each page, by its path. The result of a page shows the name
// of its section in the language of the reader.
const sectionByPath: ReadonlyMap<string, string> = new Map(
	pages.map((page) => [page.path, page.category]),
)

/** The slug of the tab of a path, the last part before the hash: `/grid/sorting#basic` gives `sorting`. */
function slugOfHref(href: string): string {
	return href.split('#')[0]?.split('/').at(-1) ?? ''
}

/**
 * The entry with its label in the language of the reader. A page keeps its
 * name, and takes its common name as `alias` when the two are not the same.
 */
function localizeLabel<T extends Matchable>(intl: IntlShape, option: T): T {
	if (option.kind === 'example') {
		return { ...option, label: exampleTitle(intl, option.href.split('#')[1] ?? '', option.label) }
	}

	if (option.kind === 'page') {
		const alias = pageName(intl, option.href, option.label)

		return alias.toLowerCase() === option.label.toLowerCase() ? option : { ...option, alias }
	}

	if (option.kind === 'tab') {
		return { ...option, label: tabName(intl, slugOfHref(option.href), option.label) }
	}

	return option
}

/**
 * Where the entry is. The section of a page and the name of a tab, as in
 * "Grid › Sorting", show in the language of the reader. The names from the
 * code stay as they are. A page shows its common name before its section,
 * when the name is not the same as the label.
 */
function formatContext(intl: IntlShape, option: Matchable): string {
	const section = option.kind === 'page' ? sectionByPath.get(option.href) : undefined

	if (section !== undefined) {
		const label = sectionLabel(intl, section)

		return option.alias ? `${option.alias} · ${label}` : label
	}

	const [page, tab] = option.context.split(' › ')

	return tab === undefined
		? option.context
		: `${page} › ${tabName(intl, slugOfHref(option.href), tab)}`
}

/**
 * The entry as the reader sees it: its label and its place in the language of
 * the reader, and the common name of a page as its `alias`.
 */
export function localizeEntry<T extends Matchable>(intl: IntlShape, entry: T): T {
	const named = localizeLabel(intl, entry)

	return { ...named, place: formatContext(intl, named) }
}
