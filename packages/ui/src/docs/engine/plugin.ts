import fs from 'node:fs'
import path from 'node:path'
import type { ModuleNode, Plugin } from 'vite'
import type { DocMeta } from './contracts'
import type { ApiExtractor, ExtraDefaults } from './extractor'
import { enumerateSurface, isExcludedSource } from './extractor/surface'
import { createModuleResolver, deriveDocMeta, type ParsedDoc, parseDoc } from './parse'
import { scanMarkdown } from './scan'
import { virtualJsonModules } from './virtual-json'

/** Options for {@link docsPlugin}. */
export type DocsPluginOptions = {
	/**
	 * The documented library's import prefix; drives module derivation.
	 * @defaultValue the documented package's `package.json` `name`
	 */
	packageName?: string

	/** Directory of doc markdown, relative to the Vite root. @defaultValue 'content' */
	contentDir?: string

	/**
	 * Absolute path to the documented package. Backs `virtual:docs/api` via the
	 * extractor and the surface each doc's module reconciles against.
	 */
	apiPackageDir: string

	/** Supplies extra component prop defaults (e.g. a design system's variant axes) to the extractor. */
	extraDefaults?: ExtraDefaults
}

const MANIFEST_ID = 'virtual:docs/manifest'

const API_ID = 'virtual:docs/api'

const MODULES_ID = 'virtual:docs/modules'

/** The `name` from a package's `package.json` — the default import prefix. */
function readPackageName(packageDir: string): string {
	const manifest = fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')

	return (JSON.parse(manifest) as { name: string }).name
}

/**
 * The docs engine's single Vite plugin. Three concerns: transform each
 * `content/**` markdown file into a typed doc module (its meta and prose body),
 * expose the scanned {@link DocMeta} list as `virtual:docs/manifest` and the
 * extracted API as `virtual:docs/api`, and serve the documented modules' live
 * imports as `virtual:docs/modules` for the Overview and Usage renders.
 */
export function docsPlugin({
	contentDir = 'content',
	packageName: packageNameOption,
	apiPackageDir,
	extraDefaults,
}: DocsPluginOptions): Plugin {
	// Default the import prefix to the documented package's own name, so a repo
	// that vendors this package under a different name (e.g. `@scope/ui`) needs
	// no config edit — its manifest is the single source of truth.
	const packageName = packageNameOption ?? readPackageName(apiPackageDir)

	let contentRoot = contentDir

	// The package's real export surface: `specifier → entry file`. Reconciles
	// each doc's module against it (so derivation yields specifiers that exist,
	// not a guessed shape) and scopes API extraction to what's documented.
	const surface = enumerateSurface(apiPackageDir, packageName)

	const resolveModule = createModuleResolver([...surface.keys()], packageName)

	const deriveOptions = { packageName, resolveModule }

	// Parse cache keyed by absolute md path; cleared per file on change.
	const cache = new Map<string, ParsedDoc>()

	// Created on the api module's first read — a dynamic import so the dev
	// server boots without paying for the extractor until a page needs it.
	let extractor: ApiExtractor | null = null

	const loadExtractor = async (): Promise<ApiExtractor> => {
		if (!extractor) {
			const { createExtractor } = await import('./extractor')

			extractor = createExtractor({
				packageDir: apiPackageDir,
				packageName,
				extraDefaults,
				surface,
			})
		}

		return extractor
	}

	const isApiSource = (file: string) => {
		const rel = path.relative(apiPackageDir, file).split(path.sep).join('/')

		return rel.startsWith('src/') && !isExcludedSource(rel)
	}

	const isContentMd = (file: string) => file.startsWith(`${contentRoot}/`) && file.endsWith('.md')

	const parsedFor = (file: string): ParsedDoc => {
		let parsed = cache.get(file)

		if (!parsed) {
			parsed = parseDoc(fs.readFileSync(file, 'utf8'), file)

			cache.set(file, parsed)
		}

		return parsed
	}

	// Scan, parse, and derive every doc's meta once; the manifest and the
	// documented-module set are both projections of this list. Cleared when a
	// content file changes so the next read re-derives.
	let metaList: DocMeta[] | null = null

	const allMeta = (): DocMeta[] => {
		metaList ??= scanMarkdown(contentRoot).map((file) =>
			deriveDocMeta(path.relative(contentRoot, file), parsedFor(file), deriveOptions),
		)

		return metaList
	}

	// The distinct real module specifiers the content actually documents, so API
	// extraction covers those and not the whole package — a 2-page site never
	// pays to extract 90 components.
	const documentedModules = (): string[] => [
		...new Set(allMeta().flatMap((meta) => (surface.has(meta.module) ? [meta.module] : []))),
	]

	const jsonHooks = virtualJsonModules([
		{
			id: MANIFEST_ID,
			generate: (): DocMeta[] => [...allMeta()].sort((a, b) => a.name.localeCompare(b.name)),
			shouldInvalidate: isContentMd,
		},
		{
			id: API_ID,
			generate: async () => (await loadExtractor()).extract(documentedModules()),
			shouldInvalidate: isApiSource,
		},
	])

	return {
		name: 'docs',

		configResolved(config) {
			contentRoot = path.resolve(config.root, contentDir)
		},

		resolveId(id) {
			if (id === MODULES_ID) return `\0${id}`

			return jsonHooks.resolveId(id)
		},

		load(id) {
			// A `specifier → lazy import` map of the documented modules, so the
			// Overview and Usage renders can resolve a synthesized element's real
			// component at runtime. Generated (not JSON) — the values are live
			// imports Vite bundles by their real export-map specifiers.
			if (id === `\0${MODULES_ID}`) {
				const entries = documentedModules().map(
					(specifier) =>
						`\t${JSON.stringify(specifier)}: () => import(${JSON.stringify(specifier)}),`,
				)

				return `export const modules = {\n${entries.join('\n')}\n}\n`
			}

			return jsonHooks.load(id)
		},

		transform(code, id) {
			const file = id.split('?')[0] ?? id

			if (!isContentMd(file)) return undefined

			// The manifest generator already parsed and cached every doc; reuse
			// that entry (HMR deletes it on change, so a hit is current) rather
			// than lexing the same Markdown a second time per build.
			const parsed = cache.get(file) ?? parseDoc(code, file)

			cache.set(file, parsed)

			const meta = deriveDocMeta(path.relative(contentRoot, file), parsed, deriveOptions)

			return {
				code: [
					`export const meta = ${JSON.stringify(meta)}`,
					`export const sections = ${JSON.stringify(parsed.sections)}`,
					'export default { meta, sections }',
				].join('\n\n'),
				map: null,
			}
		},

		handleHotUpdate(ctx) {
			// Mark the extractor stale so the next api read rebuilds its program.
			if (isApiSource(ctx.file)) extractor?.invalidate()

			const fromJson = jsonHooks.handleHotUpdate(ctx)

			const invalidated: ModuleNode[] = []

			if (isContentMd(ctx.file)) {
				cache.delete(ctx.file)

				metaList = null

				// The documented-module set may have changed, so refresh the map.
				const modulesMod = ctx.server.moduleGraph.getModuleById(`\0${MODULES_ID}`)

				if (modulesMod) {
					ctx.server.moduleGraph.invalidateModule(modulesMod)

					invalidated.push(modulesMod)
				}
			}

			if (invalidated.length === 0) return fromJson

			return [...(fromJson ?? ctx.modules), ...invalidated]
		},
	}
}
