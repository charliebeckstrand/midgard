import path from 'node:path'
import type { Plugin } from 'vite'
import { buildApi } from '../api-reference'
import { virtualJsonHooks } from './virtual-json'

/**
 * Vite plugin that pre-computes API reference data at build time. Exposes
 * `virtual:api-reference` — the parsed prop definitions for every component,
 * small enough to inline in the main bundle and skip the runtime source-load
 * + parse round-trip.
 */
export function apiReferencePlugin(): Plugin {
	let srcDir = ''

	return {
		name: 'api-reference-data',

		configResolved(config) {
			srcDir = path.resolve(config.root, '..')
		},

		...virtualJsonHooks({
			id: 'virtual:api-reference',
			generate: () => buildApi(srcDir),
			shouldInvalidate: (file) =>
				file.startsWith(srcDir) &&
				/\.tsx?$/.test(file) &&
				!file.includes(`${path.sep}docs${path.sep}`),
		}),
	}
}
