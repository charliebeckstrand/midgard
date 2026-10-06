import path from 'node:path'
import { prefixRegex } from '@rolldown/pluginutils'
import type {
	DevEnvironment,
	EnvironmentModuleGraph,
	EnvironmentModuleNode,
	Plugin,
	ViteDevServer,
} from 'vite'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import { type BarrelApi, createApiExtractor } from './api.ts'
import {
	attachMeta,
	CODE,
	codeIdOf,
	EXAMPLE,
	type ExampleCode,
	exampleFiles,
	loadCodes,
} from './examples.ts'
import { findPages, type Page, type PageLink } from './pages.ts'

const VIRTUAL = 'virtual:docs/'

const API = `${VIRTUAL}api/`

const PAGES = `${VIRTUAL}pages`

// A source file of `ui`: TypeScript, outside the docs and the tests.
const SOURCE = /^(?!.*\/__tests__\/).*\.tsx?$/

/** The resolved id of a virtual module. */
function virtualId(name: string): string {
	return `\0${name}`
}

/** The data of `virtual:docs/pages`: the link of each page. */
function linksOf(found: readonly Page[]): string {
	return data(found.map(({ folder, ...link }): PageLink => link))
}

/** The routes that the pages give (`app/routes.ts`): the path, the folder and the tabs of each page. */
function routesOf(found: readonly Page[]): string {
	return JSON.stringify(found.map(({ path, folder, tabs }) => [path, folder, tabs]))
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
 * - `virtual:docs/code/<folder>`: the code of each example in a folder of `pages/`, highlighted ({@link loadCodes}).
 *
 * It adds the title and the code module to the default export of each
 * example in `pages/` ({@link attachMeta}). In dev, an edit to a source file
 * of `ui` updates the API data of the open pages with no reload.
 *
 * In dev, a page or a tab that is added, removed or renamed in `pages/`
 * changes the routes. React Router reads the routes only when the server
 * starts, so the plugin restarts the server, and the browser loads the page
 * again. An edit to an `index.tsx` that changes only the name of a page
 * updates `virtual:docs/pages`.
 */
export function reactDocs(): Plugin {
	const docs = path.resolve(import.meta.dirname, '..')

	const ui = path.resolve(docs, '..', '..')

	const pages = path.join(docs, 'pages')

	const extractor = createApiExtractor(ui)

	// The API data of each barrel. The client build and the server build read
	// the same barrels, so the TypeScript server runs once for both.
	const barrels = new Map<string, Promise<BarrelApi>>()

	// The code of the examples of each folder. The client build and the server
	// build import the same examples, so each highlight runs once for both.
	const codes = new Map<string, Promise<Record<string, ExampleCode>>>()

	// The routes that the server started with ({@link routesOf}).
	let routes = ''

	// The data of `virtual:docs/pages` that each environment loaded last.
	const links = new Map<string, string>()

	/**
	 * The modules that an edit to an `index.tsx` in `pages/` makes stale in
	 * `environment`: `virtual:docs/pages` when the links of the pages change.
	 * When the routes change, it restarts the server and gives `null`.
	 */
	function staleLinks(
		environment: DevEnvironment,
		server: ViteDevServer,
	): EnvironmentModuleNode[] | null {
		const found = findPages(docs)

		const next = routesOf(found)

		if (next !== routes) {
			// The update runs in each environment, and the first one restarts the server.
			routes = next

			void server.restart()

			return null
		}

		const module = environment.moduleGraph.getModuleById(virtualId(PAGES))

		return module && links.get(environment.name) !== linksOf(found) ? [module] : []
	}

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
					const code = linksOf(findPages(docs))

					links.set(this.environment.name, code)

					return code
				}

				if (name.startsWith(API)) {
					const barrel = name.slice(API.length)

					return data(await getOrCompute(barrels, barrel, () => extractor.extract(barrel)))
				}

				if (name.startsWith(CODE)) {
					const folder = path.join(pages, name.slice(CODE.length))

					const files = await exampleFiles(folder)

					for (const file of files) this.addWatchFile(file)

					return data(
						await getOrCompute(codes, folder, () => loadCodes(this.parse.bind(this), files)),
					)
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
		configureServer() {
			routes = routesOf(findPages(docs))
		},
		hotUpdate({ file, type, modules, server }) {
			const graph = this.environment.moduleGraph

			let stale: EnvironmentModuleNode[] = []

			if (file.startsWith(pages) && file.endsWith('/index.tsx')) {
				const next = staleLinks(this.environment, server)

				if (next === null) return []

				stale = next
			} else if (file.startsWith(pages)) {
				codes.delete(path.dirname(file))

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
 * that is the code module of its folder and each page that imports it: the kit reads the
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

	const code = graph.getModuleById(virtualId(codeIdOf(pages, file)))

	return [...(code ? [code] : []), ...modules.flatMap((module) => [...module.importers])]
}
