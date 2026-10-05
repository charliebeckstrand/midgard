import type { ModuleNode, Plugin, ViteDevServer } from 'vite'

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
 * A family of virtual modules over one memoized source record. A manifest
 * module at `manifestId` exports `{ key: () => import('${prefix}${key}') }`,
 * and each key module at `${prefix}${key}` exports `record[key]`. The
 * manifest's specifiers are string literals that Rollup can analyze, so each
 * key splits into its own chunk that the consumer fetches on demand.
 *
 * The manifest renders from `keys` alone, and never waits for the record.
 * `generate` runs at the first key read, and a key module's load waits for the
 * record. An expensive record thus stays off the path of the page that imports
 * the manifest. After a change that `shouldInvalidate` matches, the manifest
 * invalidates when `keys` differs. The record generates again in the
 * background, and a served key module whose slice differs reloads when the new
 * record resolves. Thus a slow record never holds up the edit's own update.
 */
export type VirtualJsonFamilySpec = {
	prefix: string
	manifestId: string
	/** The keys of the record, in manifest order. The manifest reads only these. */
	keys: () => string[]
	generate: () => Record<string, unknown> | Promise<Record<string, unknown>>
	shouldInvalidate: (file: string) => boolean
}

// `cached` holds the served JSON, and stays null until the first read.
type FixedEntry = { spec: VirtualJsonSpec; resolved: string; cached: string | null }

type FamilyEntry = {
	spec: VirtualJsonFamilySpec
	manifestResolved: string
	// The keys that the served manifest lists, and null until the first read.
	keys: string[] | null
	// The record that key modules read, and null until the first key read.
	record: Promise<Record<string, unknown>> | null
	// Resolved ids of key modules the load hook has served, so HMR can invalidate
	// exactly those the browser holds. An invalidated id leaves the set, and the
	// next read adds it again.
	loaded: Set<string>
}

function isFamily(spec: VirtualJsonSpec | VirtualJsonFamilySpec) {
	return 'prefix' in spec
}

/** Whether two key lists hold the same keys in the same order. */
function sameKeys(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((key, i) => key === b[i])
}

/**
 * Run `generate` for a family and hold its record. A synchronous throw becomes
 * a rejection, so each key read fails the same way.
 */
function regenerate(fam: FamilyEntry): Promise<Record<string, unknown>> {
	fam.record = Promise.resolve().then(() => fam.spec.generate())

	return fam.record
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
 * the edited file's HMR update and leave the browser on stale code. A family
 * record generates again after the hook returns, and its changed key modules
 * reload on their own (see {@link VirtualJsonFamilySpec}). Spread the
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
				keys: null,
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
		fam.keys = fam.spec.keys()

		const entries = fam.keys.map(
			(key) => `${JSON.stringify(key)}: () => import(${JSON.stringify(fam.spec.prefix + key)})`,
		)

		return `export default {${entries.join(',')}}`
	}

	// The record key of a key module's resolved id: the id less `\0` and the prefix.
	const keyOf = (fam: FamilyEntry, resolved: string) => resolved.slice(1 + fam.spec.prefix.length)

	// Serve one key module: `export default <record[key]>`, tracking its resolved
	// id so HMR can reload it.
	async function renderKey(fam: FamilyEntry, resolved: string): Promise<string> {
		const record = await (fam.record ?? regenerate(fam))

		fam.loaded.add(resolved)

		return `export default ${JSON.stringify(record[keyOf(fam, resolved)] ?? null)}`
	}

	// After the record generates again, reload each served key module whose slice
	// changed. A previous record that failed counts as changed for every key.
	async function reloadChangedKeys(
		fam: FamilyEntry,
		previous: Promise<Record<string, unknown>>,
		next: Promise<Record<string, unknown>>,
		server: ViteDevServer,
	): Promise<void> {
		try {
			const before = await previous.catch(() => null)

			const after = await next

			// A later change started another pass. That pass reloads against this one.
			if (fam.record !== next) return

			for (const keyId of [...fam.loaded]) {
				const key = keyOf(fam, keyId)

				if (before && JSON.stringify(before[key] ?? null) === JSON.stringify(after[key] ?? null)) {
					continue
				}

				fam.loaded.delete(keyId)

				const mod = server.moduleGraph.getModuleById(keyId)

				if (mod) await server.reloadModule(mod)
			}
		} catch (error) {
			server.config.logger.error(`${fam.spec.manifestId}: ${String(error)}`)
		}
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

				// A served manifest joins this update only when its key list changed.
				if (fam.keys !== null) {
					const keys = fam.spec.keys()

					if (!sameKeys(fam.keys, keys)) {
						fam.keys = keys

						invalidate(fam.manifestResolved)
					}
				}

				const previous = fam.record

				// Never served: the first key read generates.
				if (previous === null) continue

				void reloadChangedKeys(fam, previous, regenerate(fam), server)
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
