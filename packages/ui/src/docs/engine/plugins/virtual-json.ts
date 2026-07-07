import type { ModuleNode, Plugin } from 'vite'

type Hooks = Required<Pick<Plugin, 'resolveId' | 'load' | 'handleHotUpdate'>>

/**
 * One virtual JSON module: a stable id, a generator run at first read, and a
 * predicate telling HMR which file changes invalidate its cache.
 */
export type VirtualJsonSpec = {
	id: string
	generate: () => unknown
	shouldInvalidate: (file: string) => boolean
}

type Entry = { spec: VirtualJsonSpec; resolved: string; cached: string | null }

/**
 * Build the resolveId / load / handleHotUpdate hooks for one or more virtual
 * modules whose body is `export default <JSON>`.
 *
 * Each spec gets its own `\0`-prefixed resolved id and its own lazily-filled
 * cache; `load` generates on first read, and `handleHotUpdate` clears only the
 * caches whose `shouldInvalidate` matches the changed file. Vite *replaces* the
 * update's module list with a hook's returned array, so the return folds the
 * changed file's own affected modules (`ctx.modules`) back in alongside the
 * invalidated virtual modules — returning the virtual modules alone would drop
 * the edited file's HMR update and leave the browser on stale code. Spread the
 * returned hooks into a Plugin alongside `name` and any other hooks. A single
 * docs plugin can serve every docs virtual module through one call.
 */
export function virtualJsonModules(specs: VirtualJsonSpec[]): Hooks {
	const entries: Entry[] = specs.map((spec) => ({ spec, resolved: `\0${spec.id}`, cached: null }))

	const byId = new Map(entries.map((e) => [e.spec.id, e]))

	const byResolved = new Map(entries.map((e) => [e.resolved, e]))

	return {
		resolveId(id) {
			return byId.get(id)?.resolved
		},

		load(id) {
			const entry = byResolved.get(id)

			if (!entry) return undefined

			entry.cached ??= JSON.stringify(entry.spec.generate())

			return `export default ${entry.cached}`
		},

		handleHotUpdate({ file, modules, server }) {
			const invalidated: ModuleNode[] = []

			for (const entry of entries) {
				if (!entry.spec.shouldInvalidate(file)) continue

				entry.cached = null

				const mod = server.moduleGraph.getModuleById(entry.resolved)

				if (mod) {
					server.moduleGraph.invalidateModule(mod)

					invalidated.push(mod)
				}
			}

			// Nothing to invalidate: return undefined so Vite keeps its default
			// update (the file's own modules) untouched.
			if (invalidated.length === 0) return undefined

			// Fold the file's own affected modules back in; a returned array
			// replaces Vite's list, so omitting them drops the edit's own update.
			return [...modules, ...invalidated]
		},
	}
}

/**
 * Single-module convenience wrapper over {@link virtualJsonModules}.
 */
export function virtualJsonHooks(opts: VirtualJsonSpec): Hooks {
	return virtualJsonModules([opts])
}
