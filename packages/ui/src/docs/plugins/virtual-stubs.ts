import type { Plugin } from 'vite'

/**
 * Stub the docs-only virtual modules for vitest. Vite's dep scanner crawls
 * `src/docs/registry.ts` at startup and warns when `virtual:api-reference` /
 * `virtual:demo-metas` can't be resolved; the real plugins only run during
 * the docs build, and `buildApi` walks a TS program over the whole package
 * — wasted work for tests that never touch the registry. Empty defaults
 * keep the scan quiet without paying that cost.
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
