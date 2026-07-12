import fs from 'node:fs'
import path from 'node:path'
import { type ModuleNode, type Plugin, transformWithEsbuild } from 'vite'
import type { DocMeta } from './contracts'
import { deriveDocMeta, type ParsedDoc, parseDoc } from './parse'
import { virtualJsonModules } from './virtual-json'

/** Options for {@link docsPlugin}. */
export type DocsPluginOptions = {
	/** Directory of doc markdown, relative to the Vite root. @defaultValue 'content' */
	contentDir?: string

	/** The documented library's import prefix; drives module derivation. @defaultValue 'ui' */
	packageName?: string
}

const MANIFEST_ID = 'virtual:docs/manifest'

const PREVIEW_PREFIX = 'virtual:docs/preview/'

/**
 * The docs engine's single Vite plugin. Three concerns: transform each
 * `content/**` markdown file into a typed doc module, serve every `tsx preview`
 * fence as a compiled virtual module (esbuild only — plugin-react never sees
 * them), and expose the scanned {@link DocMeta} list as `virtual:docs/manifest`.
 */
export function docsPlugin({
	contentDir = 'content',
	packageName = 'ui',
}: DocsPluginOptions = {}): Plugin {
	let contentRoot = contentDir

	// Parse cache keyed by absolute md path; cleared per file on change.
	const cache = new Map<string, ParsedDoc>()

	const isContentMd = (file: string) => file.startsWith(`${contentRoot}/`) && file.endsWith('.md')

	/** `content/`-relative path without extension: `components/button`. */
	const docPathOf = (file: string) =>
		path
			.relative(contentRoot, file)
			.replaceAll('\\', '/')
			.replace(/\.md$/, '')
			.replace(/\/index$/, '')

	const fileOf = (docPath: string) => {
		const flat = path.join(contentRoot, `${docPath}.md`)

		if (fs.existsSync(flat)) return flat

		return path.join(contentRoot, docPath, 'index.md')
	}

	const parsedFor = (file: string): ParsedDoc => {
		let parsed = cache.get(file)

		if (!parsed) {
			parsed = parseDoc(fs.readFileSync(file, 'utf8'), file)

			cache.set(file, parsed)
		}

		return parsed
	}

	const scanDocs = (dir: string): string[] => {
		if (!fs.existsSync(dir)) return []

		return fs
			.readdirSync(dir, { withFileTypes: true, recursive: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
			.map((entry) => path.join(entry.parentPath, entry.name))
			.sort()
	}

	const jsonHooks = virtualJsonModules([
		{
			id: MANIFEST_ID,
			generate: (): DocMeta[] =>
				scanDocs(contentRoot)
					.map((file) =>
						deriveDocMeta(path.relative(contentRoot, file), parsedFor(file), packageName),
					)
					.sort((a, b) => a.name.localeCompare(b.name)),
			shouldInvalidate: isContentMd,
		},
	])

	return {
		name: 'docs',

		configResolved(config) {
			contentRoot = path.resolve(config.root, contentDir)
		},

		resolveId(id) {
			if (id.startsWith(PREVIEW_PREFIX)) return `\0${id}`

			return jsonHooks.resolveId(id)
		},

		load(id) {
			if (id.startsWith(`\0${PREVIEW_PREFIX}`)) {
				const ref = id.slice(PREVIEW_PREFIX.length + 1)

				const slash = ref.lastIndexOf('/')

				const docPath = ref.slice(0, slash)

				const index = Number(ref.slice(slash + 1))

				const file = fileOf(docPath)

				const fence = parsedFor(file).previews[index]

				if (!fence) throw new Error(`${file}: preview fence #${index} not found`)

				return transformWithEsbuild(fence.code, `${docPath.replaceAll('/', '-')}-${index}.tsx`, {
					loader: 'tsx',
					jsx: 'automatic',
				})
			}

			return jsonHooks.load(id)
		},

		transform(code, id) {
			const file = id.split('?')[0] ?? id

			if (!isContentMd(file)) return undefined

			const parsed = parseDoc(code, file)

			cache.set(file, parsed)

			const docPath = docPathOf(file)

			const meta = deriveDocMeta(path.relative(contentRoot, file), parsed, packageName)

			const previews = parsed.previews.map(
				(fence, index) =>
					`{ ${fence.title !== undefined ? `title: ${JSON.stringify(fence.title)}, ` : ''}${
						fence.section !== undefined ? `section: ${JSON.stringify(fence.section)}, ` : ''
					}source: ${JSON.stringify(fence.code)}, load: () => import(${JSON.stringify(
						`${PREVIEW_PREFIX}${docPath}/${index}`,
					)}) }`,
			)

			return {
				code: [
					`export const meta = ${JSON.stringify(meta)}`,
					`export const body = ${JSON.stringify(parsed.body)}`,
					`export const previews = [${previews.join(', ')}]`,
					'export default { meta, body, previews }',
				].join('\n\n'),
				map: null,
			}
		},

		handleHotUpdate(ctx) {
			if (isContentMd(ctx.file)) cache.delete(ctx.file)

			const fromJson = jsonHooks.handleHotUpdate(ctx)

			const invalidated: ModuleNode[] = []

			if (isContentMd(ctx.file)) {
				const prefix = `\0${PREVIEW_PREFIX}${docPathOf(ctx.file)}/`

				for (const [id, mod] of ctx.server.moduleGraph.idToModuleMap) {
					if (!id.startsWith(prefix)) continue

					ctx.server.moduleGraph.invalidateModule(mod)

					invalidated.push(mod)
				}
			}

			if (invalidated.length === 0) return fromJson

			return [...(fromJson ?? ctx.modules), ...invalidated]
		},
	}
}
