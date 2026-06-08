import path from 'node:path'
import type { Plugin } from 'vite'
import { buildApi } from '../api-reference'
import {
	buildNameMap,
	buildTagSuffix,
	findSrcDir,
	moduleNameFor,
	parseReExports,
} from './component-tags'
import { generateDemoMetas } from './demo-metas'
import { collectHelpers } from './derive-code/collect-helpers'
import { virtualJsonModules } from './virtual-json'

/**
 * The single Vite plugin backing the docs site. It folds what used to be five
 * separate plugins:
 *
 *  - `virtual:api-reference`     — prop data parsed from component sources
 *  - `virtual:demo-metas`        — each demo's `{ name?, category? }`
 *  - `virtual:component-modules` — `{ componentName → module }` for snippet imports
 *  - a transform tagging public index barrels with `__module` / `__name`
 *  - an `enforce: 'pre'` transform attaching helper `__code` to demo sources
 *
 * It returns TWO plugin objects, not one, and that split is load-bearing:
 * Vite's `enforce` is plugin-wide, so the `__code` transform — which has to read
 * a demo's *raw* TSX (before the JSX transform lowers it) so `collectHelpers`
 * can slice helper source — must live in its own `enforce: 'pre'` object.
 * Collapsing the two for tidiness would silently move `__code` attachment after
 * JSX lowering and break snippet extraction with no failing unit test.
 *
 * `docsPlugin({ vitest: true })` keeps the real component-modules map and the
 * tagging transform (the derive-code tests depend on both being real) while
 * stubbing api-reference and demo-metas with empty defaults and dropping the
 * demo `__code` pre-transform — matching exactly what the vitest run needs.
 */
export function docsPlugin({ vitest = false }: { vitest?: boolean } = {}): Plugin[] {
	// Resolved once in `configResolved` and shared by both returned objects via
	// this closure. `findSrcDir` locates the dir holding `components/` from either
	// the docs root (`src/docs` → `src`) or the vitest root (`packages/ui` → `src`).
	let srcDir = ''
	let demosDir = ''

	const main: Plugin = {
		name: 'docs',

		configResolved(config) {
			srcDir = findSrcDir(config.root)
			demosDir = path.resolve(config.root, 'demos')
		},

		...virtualJsonModules([
			{
				id: 'virtual:api-reference',
				generate: () => (vitest ? {} : buildApi(srcDir)),
				shouldInvalidate: (file) =>
					file.startsWith(srcDir) &&
					/\.tsx?$/.test(file) &&
					!file.includes(`${path.sep}docs${path.sep}`),
			},
			{
				id: 'virtual:demo-metas',
				generate: () => (vitest ? {} : generateDemoMetas(demosDir)),
				shouldInvalidate: (file) => file.startsWith(demosDir) && file.endsWith('.tsx'),
			},
			{
				id: 'virtual:component-modules',
				generate: () => buildNameMap(srcDir),
				shouldInvalidate: (file) => file.startsWith(srcDir),
			},
		]),

		// Tag every public component/provider/layout index barrel so the runtime
		// walker can recognise the components a demo renders.
		transform(code, id) {
			const cleanId = id.split('?')[0] ?? ''

			const moduleName = moduleNameFor(cleanId, srcDir)

			if (!moduleName) return

			const suffix = buildTagSuffix(parseReExports(code, cleanId), moduleName)

			if (!suffix) return

			return { code: code + suffix, map: null }
		},
	}

	if (vitest) return [main]

	const pre: Plugin = {
		name: 'docs:pre',

		enforce: 'pre',

		// Attach each demo helper's full source as a `__code` static so the walker
		// can show the helper's body instead of an opaque `<Helper />` tag. Must
		// see raw TSX, hence `enforce: 'pre'`.
		transform(code, id) {
			const cleanId = id.split('?')[0] ?? ''

			if (!cleanId.startsWith(demosDir + path.sep)) return

			if (!cleanId.endsWith('.tsx')) return

			const helpers = collectHelpers(code)

			if (helpers.length === 0) return

			const tail = helpers
				.map(({ name, code }) => `;Object.assign(${name}, { __code: ${JSON.stringify(code)} });`)
				.join('\n')

			return { code: `${code}\n\n${tail}\n`, map: null }
		},
	}

	return [pre, main]
}
