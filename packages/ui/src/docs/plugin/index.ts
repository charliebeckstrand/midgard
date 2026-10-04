import path from 'node:path'
import { prefixRegex } from '@rolldown/pluginutils'
import type { EnvironmentModuleGraph, EnvironmentModuleNode, Plugin } from 'vite'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import { type BarrelApi, createApiExtractor } from './api.ts'
import { attachMeta, CODE, type ExampleCode, loadCode } from './examples.ts'
import { findPages, type PageLink } from './pages.ts'

const VIRTUAL = 'virtual:docs/'

const API = `${VIRTUAL}api/`

const PAGES = `${VIRTUAL}pages`

// A source file of `ui`: TypeScript, outside the docs and the tests.
const SOURCE = /^(?!.*\/__tests__\/).*\.tsx?$/

// An example module in `pages/`: a TSX file that is not the index of a page or a tab.
const EXAMPLE = /(?<!\/index)\.tsx$/

/** The resolved id of a virtual module. */
function virtualId(name: string): string {
	return `\0${name}`
}

/**
 * A module whose default export is `value`. `JSON.parse` of a string is
 * faster to parse than the same data as an object literal.
 */
function data(value: unknown): string {
	return `export default JSON.parse(${JSON.stringify(JSON.stringify(value))})`
}

/**
 * The Vite plugin of the docs. It gives three virtual modules, each of which
 * exports data:
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

	// The API data of each barrel. The client build and the server build read
	// the same barrels, so the TypeScript server runs once for both.
	const barrels = new Map<string, Promise<BarrelApi>>()

	// The code of each example, by file. The client build and the server build
	// import the same examples, so each highlight runs once for both.
	const codes = new Map<string, Promise<ExampleCode>>()

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
				const name = id.slice(1)

				if (name === PAGES) {
					return data(findPages(docs).map(({ folder, ...link }): PageLink => link))
				}

				if (name.startsWith(API)) {
					const barrel = name.slice(API.length)

					return data(await getOrCompute(barrels, barrel, () => extractor.extract(barrel)))
				}

				if (name.startsWith(CODE)) {
					const file = path.join(pages, `${name.slice(CODE.length)}.tsx`)

					this.addWatchFile(file)

					return data(await getOrCompute(codes, file, () => loadCode(this.parse.bind(this), file)))
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
		hotUpdate({ file, type, modules }) {
			const graph = this.environment.moduleGraph

			let stale: EnvironmentModuleNode[] = []

			if (file.startsWith(pages)) {
				codes.delete(file)

				stale = staleExample(graph, pages, file, modules)
			} else if (SOURCE.test(file) && !file.startsWith(docs)) {
				barrels.clear()

				extractor.refresh({ file, type })

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
