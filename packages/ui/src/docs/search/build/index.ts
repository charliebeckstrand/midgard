import path from 'node:path'
import { humanize } from '../../kit/humanize.ts'
import type { BarrelApi } from '../../plugin/api.ts'
import { findPages, type Page } from '../../plugin/pages.ts'
import { keywordsByPath } from '../keywords.ts'
import type { SearchEntry } from '../types.ts'
import type { SearchRoute, SearchSource } from './source.ts'
import { apiSource } from './sources/api.ts'
import { pageSource } from './sources/pages.ts'

// The build of the search. The docs plugin runs it in Node and serves its
// result as `virtual:docs/search`.

/** The sources of the entries, in the order of their entries on each route. */
const SOURCES: readonly SearchSource[] = [pageSource, apiSource]

/** The route of each page and of each of its tabs, in the order of the pages. */
function findRoutes(docs: string, found: readonly Page[]): SearchRoute[] {
	const pages = path.join(docs, 'pages')

	return found.flatMap((page): SearchRoute[] => [
		{
			page,
			tab: undefined,
			folder: path.join(pages, page.folder),
			href: page.path,
			context: page.name,
		},
		...page.tabs.map((tab) => ({
			page,
			tab,
			folder: path.join(pages, page.folder, tab),
			href: `${page.path}/${tab}`,
			context: `${page.name} › ${humanize(tab)}`,
		})),
	])
}

/**
 * The entries of the search of the docs at `docs`: each page, each tab, and
 * each component, prop, and event of the API reference of a page or a tab. Each source runs on each route, and the entries keep the
 * order of the routes and of {@link SOURCES}. `readApi` gives the API data of
 * a barrel.
 */
export async function collectEntries(
	docs: string,
	readApi: (barrel: string) => Promise<BarrelApi>,
): Promise<SearchEntry[]> {
	const pages = findPages(docs)

	const tools = { readApi, keywords: keywordsByPath(new Set(pages.map((page) => page.path))) }

	const found = await Promise.all(
		findRoutes(docs, pages).flatMap((route) => SOURCES.map((source) => source(route, tools))),
	)

	return found.flat()
}
