import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { humanize } from '../../../kit/humanize.ts'
import type { SearchEntry } from '../../types.ts'
import type { SearchSource } from '../source.ts'

// The first name in the `TABS` constant of a page, such as `Variants`.
const FIRST_TAB = /^const TABS = \[\s*'([^']+)'/m

/**
 * The name of the first tab of the page in `folder`, or `undefined` for a page
 * with no tabs. The first tab is at the path of the page, so it has no folder
 * and no entry of its own.
 */
async function readFirstTab(folder: string): Promise<string | undefined> {
	return FIRST_TAB.exec(await readFile(path.join(folder, 'index.tsx'), 'utf8'))?.[1]
}

/**
 * The entry of the page, with its keywords, and the entry of each of its tabs.
 * It gives them on the route of the page only, so each page and each tab has
 * one entry. The name of the first tab is a keyword of the page, so `bar`
 * finds the Chart page, which shows the Bar tab first.
 */
export const pageSource: SearchSource = async ({ page, tab, folder }, { keywords }) => {
	if (tab !== undefined) return []

	const first = page.tabs.length > 0 ? await readFirstTab(folder) : undefined

	const words = [
		...(keywords.get(page.path) ?? []),
		...(first && first !== page.name ? [first.toLowerCase()] : []),
	]

	return [
		{
			kind: 'page',
			label: page.name,
			href: page.path,
			context: humanize(page.category),
			...(words.length > 0 && { keywords: words }),
		},
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
