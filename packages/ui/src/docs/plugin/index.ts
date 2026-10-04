import path from 'node:path'
import { prefixRegex } from '@rolldown/pluginutils'
import type { EnvironmentModuleGraph, EnvironmentModuleNode, Plugin } from 'vite'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import { createApiExtractor } from './api.ts'
import { attachMeta, CODE, loadCode } from './examples.ts'
import { findPages, type PageLink } from './pages.ts'

const VIRTUAL = 'virtual:docs/'

const API = `${VIRTUAL}api/`

const PAGES = `${VIRTUAL}pages`

// A source file of `ui`: TypeScript, outside the docs and the tests.
const SOURCE = /\.tsx?$/

// An example module in `pages/`: a TSX file that is not the index of a page or a tab.
const EXAMPLE = /(?<!\/index)\.tsx$/

/**
 * The resolved id of a virtual module. Each virtual module is JSON. In dev,
 * Vite gives a module to its JSON plugin by the `.json` at the end of the id,
 * and not by the module type of the load result.
 */
function virtualId(name: string): string {
	return `\0${name}.json`
}

/**
 * The Vite plugin of the docs. It gives three virtual modules, each as JSON:
 *
 * - `virtual:docs/api/<barrel>`: the API data of a barrel, such as `components/button` ({@link createApiExtractor}).
 * - `virtual:docs/pages`: the link of each page ({@link findPages}).
 * - `virtual:docs/code/<example>`: the code of an example, highlighted ({@link loadCode}).
 *
 * It adds the title and the code module to the default export of each
 * example in `pages/` ({@link attachMeta}). In dev, an edit to a source file
 * of `ui` updates the API data of the open pages with no reload.
 */
export function reactDocs(): Plugin {
	const docs = path.resolve(import.meta.dirname, '..')

	const ui = path.resolve(docs, '..', '..')

	const pages = path.join(docs, 'pages')

	const extractor = createApiExtractor(ui)

	// The JSON of each barrel. The client build and the server build read the
	// same barrels, so the TypeScript server runs once for both.
	const barrels = new Map<string, Promise<string>>()

	const json = (value: unknown) => ({ code: JSON.stringify(value), moduleType: 'json' as const })

	return {
		name: 'vite-plugin-react-docs',
		// The transform reads the JSX of an example, so it runs before the JSX transform.
		enforce: 'pre',
		resolveId: {
			filter: { id: prefixRegex(VIRTUAL) },
			handler: virtualId,
		},
		load: {
			filter: { id: prefixRegex(`\0${VIRTUAL}`) },
			async handler(id) {
				const name = id.slice(1, -'.json'.length)

				const parse = this.parse.bind(this)

				if (name === PAGES) {
					return json(
						findPages(docs).map(({ path, name, category }): PageLink => ({ path, name, category })),
					)
				}

				if (name.startsWith(API)) {
					const barrel = name.slice(API.length)

					const api = getOrCompute(barrels, barrel, () =>
						extractor.extract(barrel).then((data) => JSON.stringify(data)),
					)

					return { code: await api, moduleType: 'json' as const }
				}

				if (name.startsWith(CODE)) {
					const file = path.join(pages, `${name.slice(CODE.length)}.tsx`)

					this.addWatchFile(file)

					return json(await loadCode(parse, file))
				}

				return null
			},
		},
		transform: {
			filter: {
				id: { include: prefixRegex(`${pages}/`), exclude: /(?<!\.tsx)$|\/index\.tsx$/ },
			},
			handler(code, id) {
				const meta = attachMeta(this.parse.bind(this), code, id, pages)

				return meta === undefined ? null : { code: meta, map: null }
			},
		},
		hotUpdate({ file, modules }) {
			const graph = this.environment.moduleGraph

			let stale: EnvironmentModuleNode[] = []

			if (file.startsWith(pages)) {
				stale = staleExample(graph, pages, file, modules)
			} else if (SOURCE.test(file) && !file.startsWith(docs)) {
				barrels.clear()

				extractor.refresh()

				stale = [...graph.idToModuleMap.values()].filter((module) =>
					module.id?.startsWith(`\0${API}`),
				)
			}

			for (const module of stale) graph.invalidateModule(module)

			return stale.length > 0 ? [...modules, ...stale] : undefined
		},
		buildEnd() {
			extractor.close()
		},
	}
}

/**
 * The modules that an edit to a file in `pages/` makes stale. For an example,
 * that is its code module and each page that imports it: the kit reads the
 * code module from the example that the page gives it, so the page takes the
 * new example module too.
 */
function staleExample(
	graph: EnvironmentModuleGraph,
	pages: string,
	file: string,
	modules: readonly EnvironmentModuleNode[],
): EnvironmentModuleNode[] {
	if (!EXAMPLE.test(file)) return []

	const code = graph.getModuleById(
		virtualId(`${CODE}${path.relative(pages, file).slice(0, -'.tsx'.length)}`),
	)

	return [...(code ? [code] : []), ...modules.flatMap((module) => [...module.importers])]
}
