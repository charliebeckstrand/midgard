import type { ModuleNode, Plugin } from 'vite'

type Hooks = Required<Pick<Plugin, 'resolveId' | 'load' | 'handleHotUpdate'>>

/**
 * One virtual JSON module: a stable id, a generator run at first read, and a
 * predicate telling HMR which file changes can change its output. After such a
 * change, the module generates again and invalidates only when its JSON
 * differs.
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
 * own chunk fetched on demand. The consumer imports the manifest and calls a
 * key's thunk, rather than eagerly importing the whole record. After a change
 * that `shouldInvalidate` matches, the record generates again. The manifest
 * invalidates only when the key set differs, and a key module that the load
 * hook served invalidates only when its slice differs.
 */
export type VirtualJsonFamilySpec = {
	prefix: string
	manifestId: string
	generate: () => Record<string, unknown>
	shouldInvalidate: (file: string) => boolean
}

// `cached` holds the served JSON, and stays null until the first read.
type FixedEntry = { spec: VirtualJsonSpec; resolved: string; cached: string | null }

type FamilyEntry = {
	spec: VirtualJsonFamilySpec
	manifestResolved: string
	record: Record<string, unknown> | null
	// Resolved ids of key modules the load hook has served, so HMR can invalidate
	// exactly those the browser holds. An invalidated id leaves the set, and the
	// next read adds it again.
	loaded: Set<string>
}

function isFamily(spec: VirtualJsonSpec | VirtualJsonFamilySpec) {
	return 'prefix' in spec
}

/** Whether two records have the same keys, in the same order, as the manifest lists them. */
function sameKeys(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const keys = Object.keys(a)

	const next = Object.keys(b)

	return keys.length === next.length && keys.every((key, i) => key === next[i])
}

/**
 * Build the resolveId / load / handleHotUpdate hooks for one or more virtual
 * modules whose body is `export default <JSON>` (a {@link VirtualJsonSpec}) or a
 * lazily-chunked {@link VirtualJsonFamilySpec}.
 *
 * Each spec gets its own `\0`-prefixed resolved id(s) and its own lazily-filled
 * cache. `load` generates on first read. `handleHotUpdate` generates again each
 * served cache whose `shouldInvalidate` matches the changed file, and
 * invalidates a module only when its output differs. A demo edit or a component
 * edit that leaves the JSON as it was therefore stays a Fast Refresh, because
 * no virtual module joins the update. Vite *replaces* the
 * update's module list with a hook's returned array. The return therefore folds
 * the changed file's own affected modules (`ctx.modules`) back in, alongside the
 * invalidated virtual modules. Returning the virtual modules alone would drop
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
	// Rollup code-splits `${prefix}${key}` into its own chunk. Naming the keys
	// needs the whole record, so a family whose `generate` is expensive pays it in
	// full on the first manifest read.
	function renderManifest(fam: FamilyEntry): string {
		fam.record ??= fam.spec.generate()

		const entries = Object.keys(fam.record).map(
			(key) => `${JSON.stringify(key)}: () => import(${JSON.stringify(fam.spec.prefix + key)})`,
		)

		return `export default {${entries.join(',')}}`
	}

	// The record key of a key module's resolved id: the id less `\0` and the prefix.
	const keyOf = (fam: FamilyEntry, resolved: string) => resolved.slice(1 + fam.spec.prefix.length)

	// Serve one key module: `export default <record[key]>`, tracking its resolved
	// id so HMR can invalidate it.
	function renderKey(fam: FamilyEntry, resolved: string): string {
		fam.record ??= fam.spec.generate()

		const key = keyOf(fam, resolved)

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

				// Never served: the first read generates.
				if (entry.cached === null) continue

				const next = JSON.stringify(entry.spec.generate())

				if (next === entry.cached) continue

				entry.cached = next

				invalidate(entry.resolved)
			}

			for (const fam of families) {
				if (!fam.spec.shouldInvalidate(file)) continue

				const previous = fam.record

				// Never served: the first read generates.
				if (previous === null) continue

				const next = fam.spec.generate()

				fam.record = next

				if (!sameKeys(previous, next)) invalidate(fam.manifestResolved)

				for (const keyId of fam.loaded) {
					const key = keyOf(fam, keyId)

					if (JSON.stringify(previous[key] ?? null) === JSON.stringify(next[key] ?? null)) {
						continue
					}

					invalidate(keyId)

					fam.loaded.delete(keyId)
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
