import path from 'node:path'
import type { Plugin } from 'vite'
import { parsePackage } from '../component-api'
import { virtualJsonHooks } from './virtual-json'

/**
 * Vite plugin that pre-computes component API reference data at build time.
 *
 * Exposes a `virtual:component-api` module containing the parsed prop
 * definitions for every component — small enough to include in the main
 * bundle, eliminating the runtime source-loading + parsing cost.
 */
export function componentApiPlugin(): Plugin {
	let srcDir = ''

	return {
		name: 'component-api-data',

		configResolved(config) {
			srcDir = path.resolve(config.root, '..')
		},

		...virtualJsonHooks({
			id: 'virtual:component-api',
			generate: () => parsePackage(srcDir),
			shouldInvalidate: (file) =>
				file.startsWith(srcDir) &&
				/\.tsx?$/.test(file) &&
				!file.includes(`${path.sep}docs${path.sep}`),
		}),
	}
}
