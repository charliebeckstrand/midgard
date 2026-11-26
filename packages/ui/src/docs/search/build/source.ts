import type { BarrelApi } from '../../plugin/api.ts'
import type { Parser } from '../../plugin/examples.ts'
import type { Page } from '../../plugin/pages.ts'
import type { SearchEntry } from '../types.ts'

/**
 * One route of a page: the page itself, or one of its tabs. Each source runs
 * once for each route.
 */
export type SearchRoute = {
	/** The page of the route. */
	page: Page
	/** The folder of the tab, such as `sorting`, or `undefined` on the route of the page. */
	tab: string | undefined
	/** The absolute folder of the `index.tsx` of the route. */
	folder: string
	/** The path of the route, such as `/modules/grid/sorting`. */
	href: string
	/** The place of the route as the reader sees it, such as `Grid` or `Grid › Sorting`. */
	context: string
}

/** What a source can read, in addition to the files of its route. */
export type SourceTools = {
	/** Parses the code of a module. */
	parse: Parser
	/** Gives the API data of a barrel, such as `components/button`. */
	readApi: (barrel: string) => Promise<BarrelApi>
}

/**
 * A source of entries: a function that gives the entries of one route. To add
 * a kind of entry, write a source in `sources/` and add it to `SOURCES` in
 * `index.ts`.
 */
export type SearchSource = (route: SearchRoute, tools: SourceTools) => Promise<SearchEntry[]>
