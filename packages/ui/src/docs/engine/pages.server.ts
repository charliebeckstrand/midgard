import apiManifest from 'virtual:api-reference-manifest'
import type { ComponentApi } from './api-reference'
import { byName, type Page, type PageHandle, pageOf } from './pages'

// The demo modules, for the `handle` of each. Keep the patterns the same as
// `PAGE_GLOBS`. The build of the server holds each demo already, as a route.
const modules = import.meta.glob<{ handle?: PageHandle }>(
	['../demos/*/*.tsx', '../demos/*/*/index.tsx'],
	{ eager: true },
)

/** Each page of the docs site, in name order. */
export const pages: readonly Page[] = Object.entries(modules)
	.map(([file, module]) => pageOf(file, module.handle))
	.toSorted(byName)

/**
 * Returns the API data of the barrel that a page documents. It is `null` for
 * a page with no barrel, and empty for a barrel with nothing to document.
 */
export async function apiOf(page: Page | undefined): Promise<ComponentApi[] | null> {
	const load = page ? apiManifest[page.id] : undefined

	return load ? ((await load()).default ?? []) : null
}
