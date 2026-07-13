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

/**
 * A family of virtual modules sharing one memoized source record. `generate`
 * runs once and is sliced per key into a lazily-imported module at
 * `${prefix}${key}` (`export default <record[key]>`); a manifest module at
 * `manifestId` exports `{ key: () => import('${prefix}${key}') }`. The manifest's
 * specifiers are string literals Rollup can analyze, so each key splits into its
 * own chunk fetched on demand — the consumer imports the manifest and calls a
 * key's thunk, rather than eagerly importing the whole record. `shouldInvalidate`
 * clears the family wholesale: the manifest plus every key module handed out.
 */
export type VirtualJsonFamilySpec = {
	prefix: string
	manifestId: string
	generate: () => Record<string, unknown>
	shouldInvalidate: (file: string) => boolean
}

type FixedEntry = { spec: VirtualJsonSpec; resolved: string; cached: string | null }

type FamilyEntry = {
	spec: VirtualJsonFamilySpec
	manifestResolved: string
	record: Record<string, unknown> | null
	// Resolved ids of key modules the load hook has served, so HMR can invalidate
	// exactly those the browser holds. Cleared on invalidation; re-filled on reload.
	loaded: Set<string>
}

function isFamily(spec: VirtualJsonSpec | VirtualJsonFamilySpec): spec is VirtualJsonFamilySpec {
	return 'prefix' in spec
}

/**
 * Build the resolveId / load / handleHotUpdate hooks for one or more virtual
 * modules whose body is `export default <JSON>` (a {@link VirtualJsonSpec}) or a
 * lazily-chunked {@link VirtualJsonFamilySpec}.
 *
 * Each spec gets its own `\0`-prefixed resolved id(s) and its own lazily-filled
 * cache; `load` generates on first read, and `handleHotUpdate` clears only the
 * caches whose `shouldInvalidate` matches the changed file. Vite *replaces* the
 * update's module list with a hook's returned array, so the return folds the
 * changed file's own affected modules (`ctx.modules`) back in alongside the
 * invalidated virtual modules — returning the virtual modules alone would drop
 * the edited file's HMR update and leave the browser on stale code. Spread the
 * returned hooks into a Plugin alongside `name` and any other hooks. A single
 * docs plugin can serve every docs virtual module through one call.
 */
export function virtualJsonModules(specs: (VirtualJsonSpec | VirtualJsonFamilySpec)[]): Hooks {
	const fixed: FixedEntry[] = []
	const families: FamilyEntry[] = []

	for (const spec of specs) {
		if (isFamily(spec)) {
			families.push({
				spec,
				manifestResolved: `\0${spec.manifestId}`,
				record: null,
				loaded: new Set(),
			})
		} else {
			fixed.push({ spec, resolved: `\0${spec.id}`, cached: null })
		}
	}

	const fixedById = new Map(fixed.map((e) => [e.spec.id, e]))

	const fixedByResolved = new Map(fixed.map((e) => [e.resolved, e]))

	// Serialize the manifest's key thunks. Each specifier is a string literal, so
	// Rollup code-splits `${prefix}${key}` into its own chunk.
	function renderManifest(fam: FamilyEntry): string {
		fam.record ??= fam.spec.generate()

		const entries = Object.keys(fam.record).map(
			(key) => `${JSON.stringify(key)}: () => import(${JSON.stringify(fam.spec.prefix + key)})`,
		)

		return `export default {${entries.join(',')}}`
	}

	// Serve one key module: `export default <record[key]>`, tracking its resolved
	// id so HMR can invalidate it.
	function renderKey(fam: FamilyEntry, resolved: string): string {
		fam.record ??= fam.spec.generate()

		const key = resolved.slice(1 + fam.spec.prefix.length)

		fam.loaded.add(resolved)

		return `export default ${JSON.stringify(fam.record[key] ?? null)}`
	}

	return {
		resolveId(id) {
			const hit = fixedById.get(id)

			if (hit) return hit.resolved

			for (const fam of families) {
				if (id === fam.spec.manifestId) return fam.manifestResolved

				if (id.startsWith(fam.spec.prefix)) return `\0${id}`
			}

			return undefined
		},

		load(id) {
			const hit = fixedByResolved.get(id)

			if (hit) {
				hit.cached ??= JSON.stringify(hit.spec.generate())

				return `export default ${hit.cached}`
			}

			for (const fam of families) {
				if (id === fam.manifestResolved) return renderManifest(fam)

				if (id.startsWith(`\0${fam.spec.prefix}`)) return renderKey(fam, id)
			}

			return undefined
		},

		handleHotUpdate({ file, modules, server }) {
			const invalidated: ModuleNode[] = []

			const invalidate = (resolvedId: string) => {
				const mod = server.moduleGraph.getModuleById(resolvedId)

				if (mod) {
					server.moduleGraph.invalidateModule(mod)

					invalidated.push(mod)
				}
			}

			for (const entry of fixed) {
				if (!entry.spec.shouldInvalidate(file)) continue

				entry.cached = null

				invalidate(entry.resolved)
			}

			for (const fam of families) {
				if (!fam.spec.shouldInvalidate(file)) continue

				fam.record = null

				// Invalidate the manifest (its key set may have changed) and every key
				// module already served, so a prop edit re-serves fresh data.
				invalidate(fam.manifestResolved)

				for (const keyId of fam.loaded) invalidate(keyId)

				fam.loaded.clear()
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
