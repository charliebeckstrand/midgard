import path from 'node:path'
import type { Plugin } from 'vite'
import { parsePackage } from './component-api'

const VIRTUAL_ID = 'virtual:component-api'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

/**
 * Vite plugin that pre-computes component API reference data at build time.
 *
 * Exposes a `virtual:component-api` module containing the parsed prop
 * definitions for every component — small enough to include in the main
 * bundle, eliminating the runtime source-loading + parsing cost.
 */
export function componentApiPlugin(): Plugin {
	let srcDir: string

	let cachedJson: string | null = null

	return {
		name: 'component-api-data',

		configResolved(config) {
			srcDir = path.resolve(config.root, '..')
		},

		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID
		},

		load(id) {
			if (id === RESOLVED_ID) {
				cachedJson ??= JSON.stringify(parsePackage(srcDir))

				return `export default ${cachedJson}`
			}
		},

		handleHotUpdate({ file, server }) {
			if (!file.startsWith(srcDir) || !/\.tsx?$/.test(file)) return

			if (file.includes(`${path.sep}docs${path.sep}`)) return

			cachedJson = null

			const mod = server.moduleGraph.getModuleById(RESOLVED_ID)

			if (mod) {
				server.moduleGraph.invalidateModule(mod)

				return [mod]
			}
		},
	}
}
