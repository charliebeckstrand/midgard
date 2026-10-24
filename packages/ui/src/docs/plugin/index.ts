import path from 'node:path'
import { prefixRegex } from '@rolldown/pluginutils'
import { Piscina } from 'piscina'
import type {
	DevEnvironment,
	Environment,
	EnvironmentModuleGraph,
	EnvironmentModuleNode,
	ESTree,
	Plugin,
	ViteDevServer,
} from 'vite'
import type { ShikiHighlight } from '../../components/code/code-shiki-highlighter.ts'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import { type BarrelApi, createApiWorker, TASKS_AHEAD } from './api.ts'
import { readClientManifest } from './asset-urls.ts'
import { labelPage } from './component-events.ts'
import { appCatalog, createCopies, manifestPreloads, type Preloads, readLangId } from './copies.ts'
import {
	attachMeta,
	CODE,
	EXAMPLE,
	type ExampleCode,
	exampleFiles,
	type Highlight,
	loadCodes,
	type Parser,
	toCodeId,
} from './examples.ts'
import type { HighlightTask } from './highlight-worker.ts'
import { findPages, type Page, type PageLink } from './pages.ts'
import { type SearchEntry, searchEntries } from './search.ts'

const VIRTUAL = 'virtual:docs/'

const API = `${VIRTUAL}api/`

const PAGES = `${VIRTUAL}pages`

const SEARCH = `${VIRTUAL}search`

// The module of `localize`, which a page or a tab module imports (`copies.ts`).
const LOCALIZE = path.resolve(import.meta.dirname, '..', 'kit', 'localize.tsx')

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
 * It transforms each module of `pages/`. It adds the title and the code module
 * to the default export of each example ({@link attachMeta}), and it sends
 * each value that the JSX gives to a component through the Event log
 * ({@link labelPage}). It gives the copy of each module in each language that
 * has a catalog, such as `button/index.tsx?lang=es`, with each demo text in
 * that language ({@link createCopies}). Each page and each tab module shows
 * the copy in the language of the reader. The catalog
 * that the app imports has no demo text. In dev, an edit to a source file of
 * `ui` updates the API data of the open pages with no reload.
 *
 * The server build reads the manifest of the client build in `clientDir`, so
 * the Spanish HTML of a page preloads the chunks of the Spanish copy.
 *
 * In dev, a page or a tab that is added, removed or renamed in `pages/`
 * changes the routes. React Router reads the routes only when the server
 * starts, so the plugin restarts the server, and the browser loads the page
 * again. An edit to an `index.tsx` that changes only the name of a page
 * updates `virtual:docs/pages`.
 */
export function reactDocs({ clientDir }: { clientDir?: string } = {}): Plugin {
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

	// The copy of each module of `pages/` in each language that has a catalog.
	const copies = createCopies(docs, LOCALIZE)

	// The URLs of the chunks of each copy, which the server build preloads.
	let serverPreloads: Preloads | undefined

	/** The preloads of the copies in `environment`. Only the server build renders HTML. */
	function readPreloads({ config }: Environment): Preloads | undefined {
		if (!clientDir || config.consumer !== 'server' || config.command !== 'build') return undefined

		serverPreloads ??= manifestPreloads(
			() => readClientManifest(clientDir),
			config.root,
			config.base,
		)

		return serverPreloads
	}

	const lang = path.join(docs, 'lang')

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
	 * The modules that an edit to `file` in `pages/` makes stale: for an
	 * `index.tsx`, the links of the pages ({@link staleLinks}); for an example,
	 * its code module and its importers. It gives `null` when the server restarts.
	 */
	function stalePage(
		file: string,
		environment: DevEnvironment,
		server: ViteDevServer,
		modules: readonly EnvironmentModuleNode[],
	): EnvironmentModuleNode[] | null {
		if (file.endsWith('/index.tsx')) return staleLinks(environment, server)

		forgetCode(file)

		return staleExample(environment.moduleGraph, pages, file, modules)
	}

	/** Forgets the code of the folder of the example `file`, in each language. */
	function forgetCode(file: string): void {
		const code = toCodeId(pages, file)

		for (const name of codes.keys()) {
			if (readLangId(name.slice(CODE.length)).file === code.slice(CODE.length)) codes.delete(name)
		}
	}

	/** The copies in each language, which an edit to a translation makes stale. */
	function staleTranslations(graph: EnvironmentModuleGraph): EnvironmentModuleNode[] {
		copies.forget()

		codes.clear()

		return [...graph.idToModuleMap.values()].filter(
			(module) => readLangId(module.id ?? '').language !== undefined,
		)
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
					const parse: Parser = this.parse.bind(this)

					// The code module of a copy, such as `virtual:docs/code/button?lang=es`,
					// gives the code of the copy.
					const { file: folder, language } = readLangId(name.slice(CODE.length))

					const files = await exampleFiles(path.join(pages, folder))

					for (const file of files) this.addWatchFile(file)

					const translate = copies.translate(parse, language)

					return data(
						await getOrCompute(codes, name, () => loadCodes(parse, highlight, files, translate)),
					)
				}

				return null
			},
		},
		transform: {
			filter: { id: { include: [prefixRegex(`${pages}/`), prefixRegex(`${lang}/`)] } },
			async handler(code, id) {
				if (id.startsWith(`${lang}/`)) return { code: appCatalog(code), map: null }

				const { file, language } = readLangId(id)

				if (!/\.tsx?$/.test(file) || (!language && !file.endsWith('.tsx'))) return null

				const syntax = file.endsWith('.tsx') ? 'tsx' : 'ts'

				const parse = (source: string) => this.parse(source, { lang: syntax })

				const preloads = readPreloads(this.environment)

				const { source, query } = copies.source(parse, code, file, language, preloads)

				const result = await labelExample(parse(source), source, file, pages, query, (target) =>
					this.resolve(target, id).then((resolved) => resolved?.id),
				)

				if (result === undefined) return source === code ? null : { code: source, map: null }

				return { code: result, map: null }
			},
		},
		configureServer() {
			routes = formatRoutes(findPages(docs))
		},
		hotUpdate({ file, type, modules, server }) {
			const graph = this.environment.moduleGraph

			let stale: EnvironmentModuleNode[] = []

			if (file.startsWith(`${lang}${path.sep}`)) {
				stale = staleTranslations(graph)
			} else if (file.startsWith(pages)) {
				const next = stalePage(file, this.environment, server, modules)

				if (next === null) return []

				stale = next
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

	const code = toCodeId(pages, file)

	// The code module of the folder, and its copy in each language.
	const codes = [...graph.idToModuleMap.values()].filter(
		(module) => readLangId(module.id ?? '').file === virtualId(code),
	)

	return [...codes, ...modules.flatMap((module) => [...module.importers])]
}

/**
 * The code of a module of `pages/` with the meta of an example
 * ({@link attachMeta}) and the event labels of its JSX ({@link labelPage}), or
 * `undefined` when it needs neither. A data module has no JSX.
 */
async function labelExample(
	program: ESTree.Program,
	code: string,
	file: string,
	pages: string,
	query: string,
	resolve: (source: string) => Promise<string | undefined>,
): Promise<string | undefined> {
	if (!file.endsWith('.tsx')) return undefined

	const meta = EXAMPLE.test(file) ? attachMeta(program, code, file, pages, query) : undefined

	const labeled = await labelPage(program, code, resolve)

	if (meta === undefined && labeled === undefined) return undefined

	return `${labeled ?? code}${meta ?? ''}`
}
