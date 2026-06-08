import type { Plugin } from 'vite'

/**
 * Stubs the docs-only virtual modules for vitest. Vite's dep scanner crawls
 * `src/docs/registry.ts` at startup and warns when `virtual:api-reference` /
 * `virtual:demo-metas` can't be resolved. The real plugins run only during the
 * docs build; this plugin satisfies the resolver with empty defaults.
 */
export function virtualStubsPlugin(): Plugin {
	const ids = new Set(['virtual:api-reference', 'virtual:demo-metas'])

	return {
		name: 'docs-virtual-stubs',
		resolveId(id) {
			if (ids.has(id)) return `\0${id}`

			return undefined
		},
		load(id) {
			if (id.startsWith('\0') && ids.has(id.slice(1))) return 'export default {}'

			return undefined
		},
	}
}
