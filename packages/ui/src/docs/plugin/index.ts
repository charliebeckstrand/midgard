import path from 'node:path'
import { prefixRegex } from '@rolldown/pluginutils'
import { Piscina } from 'piscina'
import type {
	DevEnvironment,
	EnvironmentModuleGraph,
	EnvironmentModuleNode,
	Plugin,
	ViteDevServer,
} from 'vite'
import type { ShikiHighlight } from '../../components/code/code-shiki-highlighter.ts'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import { type BarrelApi, createApiWorker, TASKS_AHEAD } from './api.ts'
import { labelPage } from './component-events.ts'
import {
	attachMeta,
	CODE,
	EXAMPLE,
	type ExampleCode,
	exampleFiles,
	type Highlight,
	loadCodes,
	toCodeId,
} from './examples.ts'
import type { HighlightTask } from './highlight-worker.ts'
import { findPages, type Page, type PageLink } from './pages.ts'
import { type SearchEntry, searchEntries } from './search.ts'

const VIRTUAL = 'virtual:docs/'

const API = `${VIRTUAL}api/`

const PAGES = `${VIRTUAL}pages`

const SEARCH = `${VIRTUAL}search`

// A source file of `ui`: TypeScript, outside the docs and the tests.
const SOURCE = /^(?!.*\/__tests__\/).*\.tsx?$/

/** The resolved id of a virtual module. */
function virtualId(name: string): string {
	return `\0${name}`
}

/** The data of `virtual:docs/pages`: the link of each page. */
function formatLinks(pages: readonly Page[]): string {
	return data(pages.map(({ folder, ...link }): PageLink => link))
}

/** The routes that the pages give (`app/routes.ts`): the path, the folder and the tabs of each page. */
function formatRoutes(pages: readonly Page[]): string {
	return JSON.stringify(pages.map(({ path, folder, tabs }) => [path, folder, tabs]))
}

/**
 * A module whose default export is `value`. `JSON.parse` of a string is
 * faster to parse than the same data as an object literal.
 */
function data(value: unknown): string {
	return `export default JSON.parse(${JSON.stringify(JSON.stringify(value))})`
}

/**
 * The Vite plugin of the docs. It gives four virtual modules, each of which
 * exports data:
 *
 * - `virtual:docs/api/<barrel>`: the API data of a barrel, such as `components/button` ({@link createApiWorker}).
 * - `virtual:docs/pages`: the link of each page ({@link findPages}).
 * - `virtual:docs/code/<folder>`: the code of each example in a folder of `pages/`, highlighted ({@link loadCodes}).
 * - `virtual:docs/search`: the entries of the search of the docs ({@link searchEntries}).
 *
 * It transforms each module of `pages/` with one parse. It adds the title and
 * the code module to the default export of each example ({@link attachMeta}),
 * and it sends each value that the JSX gives to a component through the
 * Event log ({@link labelPage}). In dev, an edit to a source file of `ui`
 * updates the API data of the open pages with no reload.
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

	const extractor = createApiWorker(ui)

	// Shiki highlights the examples in a thread (`highlight-worker.ts`). On the
	// main thread, the highlights of the docs held the client build. The pool
	// starts on the first highlight.
	let highlighter: Piscina<HighlightTask, ShikiHighlight> | undefined

	const highlight: Highlight = (code, lang, theme) => {
		highlighter ??= new Piscina({
			filename: new URL('./highlight-worker.ts', import.meta.url).href,
			name: 'run',
			minThreads: 1,
			maxThreads: 1,
			concurrentTasksPerWorker: TASKS_AHEAD,
		})

		return highlighter.run({ code, lang, theme })
	}

	// The API data of each barrel. The client build and the server build read
	// the same barrels, so the TypeScript server runs once for both.
	const barrels = new Map<string, Promise<BarrelApi>>()

	// The code of the examples of each folder. The client build and the server
	// build import the same examples, so each highlight runs once for both.
	const codes = new Map<string, Promise<Record<string, ExampleCode>>>()

	// The entries of the search. They read each page and the API data of each
	// barrel that a page shows, so an edit to either makes them stale.
	let search: Promise<SearchEntry[]> | undefined

	// The routes that the server started with ({@link formatRoutes}).
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

		const next = formatRoutes(found)

		if (next !== routes) {
			// The update runs in each environment, and the first one restarts the server.
			routes = next

			void server.restart()

			return null
		}

		const module = environment.moduleGraph.getModuleById(virtualId(PAGES))

		return module && links.get(environment.name) !== formatLinks(found) ? [module] : []
	}

	/**
	 * The module of the search, when an edit to `file` makes it stale. An edit
	 * to a page or to a source of `ui` can change the entries.
	 */
	function staleSearch(graph: EnvironmentModuleGraph, file: string): EnvironmentModuleNode[] {
		const isPage = file.startsWith(pages)

		const isSource = SOURCE.test(file) && !file.startsWith(docs)

		if (!isPage && !isSource) return []

		search = undefined

		const module = graph.getModuleById(virtualId(SEARCH))

		return module ? [module] : []
	}

	return {
		name: 'vite-plugin-react-docs',
		// The transform reads the JSX of a page, so it runs before the JSX transform.
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
					const code = formatLinks(findPages(docs))

					links.set(this.environment.name, code)

					return code
				}

				if (name === SEARCH) {
					search ??= searchEntries(docs, this.parse.bind(this), (barrel) =>
						getOrCompute(barrels, barrel, () => extractor.extract(barrel)),
					)

					return data(await search)
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
						await getOrCompute(codes, folder, () =>
							loadCodes(this.parse.bind(this), highlight, files),
						),
					)
				}

				return null
			},
		},
		transform: {
			filter: { id: { include: prefixRegex(`${pages}/`), exclude: /(?<!\.tsx)$/ } },
			async handler(code, id) {
				const program = this.parse(code, { lang: 'tsx' })

				const meta = EXAMPLE.test(id) ? attachMeta(program, code, id, pages) : undefined

				const labeled = await labelPage(program, code, async (source) => {
					return (await this.resolve(source, id))?.id
				})

				if (meta === undefined && labeled === undefined) return null

				return { code: `${labeled ?? code}${meta ?? ''}`, map: null }
			},
		},
		configureServer() {
			routes = formatRoutes(findPages(docs))
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

			stale = [...stale, ...staleSearch(graph, file)]

			for (const module of stale) graph.invalidateModule(module)

			return stale.length > 0 ? [...modules, ...stale] : undefined
		},
		buildEnd() {
			extractor.close()

			void highlighter?.destroy()

			highlighter = undefined
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

	const code = graph.getModuleById(virtualId(toCodeId(pages, file)))

	return [...(code ? [code] : []), ...modules.flatMap((module) => [...module.importers])]
}
