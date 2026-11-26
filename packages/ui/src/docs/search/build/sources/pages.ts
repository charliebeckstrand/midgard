import { humanize } from '../../../kit/humanize.ts'
import type { SearchEntry } from '../../types.ts'
import type { SearchSource } from '../source.ts'

/**
 * The entry of the page and the entry of each of its tabs. It gives them on
 * the route of the page only, so each page and each tab has one entry.
 */
export const pageSource: SearchSource = async ({ page, tab }) => {
	if (tab !== undefined) return []

	return [
		{ kind: 'page', label: page.name, href: page.path, context: humanize(page.category) },
		...page.tabs.map(
			(name): SearchEntry => ({
				kind: 'tab',
				label: humanize(name),
				href: `${page.path}/${name}`,
				context: page.name,
			}),
		),
	]
}
