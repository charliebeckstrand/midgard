import path from 'node:path'
import { type ESTree, normalizePath } from 'vite'
import { readTranslations } from '../../../scripts/intl-catalog.ts'
import type { Manifest } from './asset-urls.ts'
import { DATA_ID, DEMO_ID, translateDemo } from './demo-text.ts'
import type { Parser, Translate } from './examples.ts'
import { findPages } from './pages.ts'

// The copy of a module of `pages/` or of `data/` in a language, such as
// `button/index.tsx?lang=es`, has each demo text in that language
// (`demo-text.ts`). Each import of a module of `pages/` or of `data/` in a copy
// points at the copy of that module in the same language. Each page and each
// tab module shows the copy in the language of the reader (`kit/localize.tsx`).

/** Parses one module, with the syntax of its file. */
type Parse = (code: string) => ESTree.Program

/** The translated messages of one language, by id. */
type Messages = Readonly<Record<string, string>>

/** The query of the copy of a module of `pages/` in a language, such as `?lang=es`. */
const LANG_QUERY = /\?lang=([a-z]{2,3})$/

/** The query that names the copy of a module in `language`. */
export function toLangQuery(language: string): string {
	return `?lang=${language}`
}

/** The file of a module id and the language of its copy, or `undefined` for the English module. */
export function readLangId(id: string): { file: string; language?: string } {
	const match = LANG_QUERY.exec(id)

	return match ? { file: id.slice(0, match.index), language: match[1] } : { file: id }
}

/**
 * `code` with each relative import of a module in one of `roots` pointed at
 * the copy of that module in `language`, so a copy imports the copies of the
 * examples and of the data that it uses. An import of the kit or of `ui` stays
 * as it is.
 */
export function pointImports(
	program: ESTree.Program,
	code: string,
	file: string,
	roots: readonly string[],
	language: string,
): string {
	const sources = program.body.flatMap((statement) =>
		(statement.type === 'ImportDeclaration' ||
			statement.type === 'ExportNamedDeclaration' ||
			statement.type === 'ExportAllDeclaration') &&
		statement.source
			? [statement.source]
			: [],
	)

	let pointed = code

	for (const source of sources.toReversed()) {
		const value = String(source.value)

		if (!value.startsWith('.')) continue

		const target = path.resolve(path.dirname(file), value)

		if (!roots.some((root) => target.startsWith(`${root}${path.sep}`))) continue

		pointed =
			pointed.slice(0, source.start) +
			JSON.stringify(`${value}${toLangQuery(language)}`) +
			pointed.slice(source.end)
	}

	return pointed
}

/**
 * `code` with its default export in the language of the reader: the page or
 * the tab module `file`, with each copy in `languages` ({@link toLangQuery}).
 * The default export of a page or a tab module is a function declaration with
 * a name, and the wrap keeps the function under that name. `kit` is the
 * module of `localize`. `preloads` gives the URL of each chunk that the copy
 * in a language adds, in the server build ({@link copyChunks}).
 */
export function localizeRoute(
	program: ESTree.Program,
	code: string,
	file: string,
	languages: readonly string[],
	kit: string,
	preloads?: Preloads,
): string {
	const statement = program.body.find(
		(node): node is ESTree.ExportDefaultDeclaration => node.type === 'ExportDefaultDeclaration',
	)

	const declaration = statement?.declaration

	if (!statement || declaration?.type !== 'FunctionDeclaration' || !declaration.id) {
		throw new Error(`${file}: a page or a tab module exports a named function by default`)
	}

	const copies = languages.map(
		(language) =>
			`${language}: () => import(${JSON.stringify(`./${path.basename(file)}${toLangQuery(language)}`)})`,
	)

	const urls = preloads
		? languages.map((language) => [language, preloads(file, language)] as const)
		: []

	const args = [declaration.id.name, `{ ${copies.join(', ')} }`]

	if (urls.some(([, files]) => files.length > 0)) {
		args.push(JSON.stringify(Object.fromEntries(urls)))
	}

	return [
		code.slice(0, statement.start),
		code.slice(declaration.start),
		`\nimport { localize as __localize } from ${JSON.stringify(kit)}`,
		`\nexport default __localize(${args.join(', ')})\n`,
	].join('')
}

/** The key of the chunk `key` and of each chunk that it imports, at any depth. */
function staticChunks(manifest: Manifest, key: string, found = new Set<string>()): Set<string> {
	const chunk = manifest[key]

	if (chunk === undefined || found.has(key)) return found

	found.add(key)

	for (const imported of chunk.imports ?? []) staticChunks(manifest, imported, found)

	return found
}

/**
 * The file of each chunk that the copy `key` of a page or a tab module loads,
 * and that the module itself does not load. The Spanish HTML of a page
 * preloads them (`kit/localize.tsx`), so the copy does not wait for the
 * module to load.
 */
export function copyChunks(manifest: Manifest, key: string): string[] {
	const loaded = new Set(
		Object.entries(manifest)
			.filter(([, chunk]) => chunk.dynamicImports?.includes(key))
			.flatMap(([parent]) => [...staticChunks(manifest, parent)]),
	)

	return [...staticChunks(manifest, key)]
		.filter((chunk) => !loaded.has(chunk))
		.map((chunk) => manifest[chunk]?.file ?? chunk)
}

/**
 * The JSON of a catalog of the docs as the app imports it, with no demo text
 * and no word of the demo data. Each copy of a module holds them in its
 * language, so the app does not look them up, and the bundle does not carry
 * them.
 */
export function appCatalog(code: string): string {
	const messages = Object.entries(JSON.parse(code) as Record<string, string>)

	return JSON.stringify(
		Object.fromEntries(
			messages.filter(([id]) => !id.startsWith(DEMO_ID) && !id.startsWith(DATA_ID)),
		),
	)
}

/** The URL of each chunk that the copy of the module `file` in `language` adds ({@link copyChunks}). */
export type Preloads = (file: string, language: string) => readonly string[]

/**
 * The {@link Preloads} of the server build, from the manifest of the client
 * build, which `read` gives. `root` is the root of the client build, and
 * `base` is the base of its URLs.
 */
export function manifestPreloads(read: () => Manifest, root: string, base: string): Preloads {
	let manifest: Manifest | undefined

	return (file, language) => {
		manifest ??= read()

		const key = `${normalizePath(path.relative(root, file))}${toLangQuery(language)}`

		return copyChunks(manifest, key).map((chunk) => `${base}${chunk}`)
	}
}

/** The copies of the modules of `pages/` and of `data/` in each language that has a catalog ({@link createCopies}). */
export type Copies = {
	/**
	 * The source of the module `file` of `pages/` or of `data/` in `language`, and the query
	 * of the copy. With no `language`, the source of the English module: a page
	 * or a tab module gives its page in the language of the reader.
	 */
	source: (
		parse: Parse,
		code: string,
		file: string,
		language?: string,
		preloads?: Preloads,
	) => { source: string; query: string }
	/** The source of an example in `language`, for the code module of a copy, or `undefined` for English. */
	translate: (parse: Parser, language?: string) => Translate | undefined
	/** Forgets the translations, after an edit to a catalog. */
	forget: () => void
}

/**
 * The copies of the modules in `docs/pages` and in `docs/data` in each
 * language that has a catalog in `docs/lang`. `kit` is the module of
 * `localize`.
 */
export function createCopies(docs: string, kit: string): Copies {
	const pages = path.join(docs, 'pages')

	const roots = [pages, path.join(docs, 'data')]

	// The translated messages of each language, by language. An edit to a
	// catalog clears them.
	let translations: Map<string, Messages> | undefined

	// The page and the tab modules: the route modules of `app/routes.ts`. The
	// routes change only when the server starts again.
	let routeFiles: Set<string> | undefined

	function readLanguages(): Map<string, Messages> {
		translations ??= new Map(
			readTranslations(path.join(docs, 'lang')).map(({ language, messages }) => [
				language,
				messages,
			]),
		)

		return translations
	}

	/** The translated messages of `language`. A language with no catalog gives none. */
	function readMessages(language: string): Messages {
		return readLanguages().get(language) ?? {}
	}

	function englishSource(parse: Parse, code: string, file: string, preloads?: Preloads): string {
		routeFiles ??= new Set(
			findPages(docs).flatMap((page) => [
				path.join(pages, page.folder, 'index.tsx'),
				...page.tabs.map((tab) => path.join(pages, page.folder, tab, 'index.tsx')),
			]),
		)

		if (!routeFiles.has(file)) return code

		return localizeRoute(parse(code), code, file, [...readLanguages().keys()], kit, preloads)
	}

	function translatedSource(parse: Parse, code: string, file: string, language: string): string {
		const translated = translateDemo(parse(code), code, file, readMessages(language))

		return pointImports(parse(translated), translated, file, roots, language)
	}

	return {
		source(parse, code, file, language, preloads) {
			if (language === undefined) {
				return { source: englishSource(parse, code, file, preloads), query: '' }
			}

			return { source: translatedSource(parse, code, file, language), query: toLangQuery(language) }
		},
		translate(parse, language) {
			if (language === undefined) return undefined

			return (code, file) =>
				translateDemo(parse(code, { lang: 'tsx' }), code, file, readMessages(language))
		},
		forget() {
			translations = undefined
		},
	}
}
