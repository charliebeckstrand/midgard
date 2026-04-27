import type { Plugin } from 'vite'

type Hooks = Required<Pick<Plugin, 'resolveId' | 'load' | 'handleHotUpdate'>>

/**
 * Build the resolveId / load / handleHotUpdate hooks for a virtual module
 * whose body is `export default <JSON>`.
 *
 * Each docs plugin computes a different payload but follows the same plumbing:
 * give it a stable virtual id, a generator that runs at first read, and a
 * predicate that tells HMR which file changes invalidate the cache. Spread the
 * returned hooks into your Plugin alongside `name` and any other hooks
 * (e.g. `componentTagsPlugin` adds a `transform` for component tagging).
 */
export function virtualJsonHooks(opts: {
	id: string
	generate: () => unknown
	shouldInvalidate: (file: string) => boolean
}): Hooks {
	const resolved = `\0${opts.id}`

	let cached: string | null = null

	return {
		resolveId(id) {
			if (id === opts.id) return resolved
		},

		load(id) {
			if (id === resolved) {
				cached ??= JSON.stringify(opts.generate())

				return `export default ${cached}`
			}
		},

		handleHotUpdate({ file, server }) {
			if (!opts.shouldInvalidate(file)) return

			cached = null

			const mod = server.moduleGraph.getModuleById(resolved)

			if (mod) {
				server.moduleGraph.invalidateModule(mod)

				return [mod]
			}
		},
	}
}
