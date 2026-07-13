import manifest from 'virtual:docs/manifest'
import type { DocModule } from '../engine'

/** Every documented surface, name-sorted; drives the sidebar, search, and routing. */
export const docs = manifest

const loaders = import.meta.glob<DocModule>('/content/**/*.md', { import: 'default' })

const cache = new Map<string, Promise<DocModule>>()

/**
 * Load one doc module by id, memoized per id so `use()` re-reads the same
 * promise across renders. A rejected load is evicted, so a retry after a
 * failure (stale chunk, offline navigation) re-attempts the import instead of
 * replaying the cached rejection.
 */
export function loadDoc(id: string): Promise<DocModule> {
	let promise = cache.get(id)

	if (!promise) {
		const loader = loaders[`/content/${id}.md`] ?? loaders[`/content/${id}/index.md`]

		promise = loader
			? loader().catch((error) => {
					cache.delete(id)

					throw error
				})
			: Promise.reject(new Error(`unknown doc: ${id}`))

		cache.set(id, promise)
	}

	return promise
}

/** Warm a doc's chunk ahead of navigation (sidebar hover/focus). */
export function preloadDoc(id: string) {
	loadDoc(id).catch(() => {})
}
