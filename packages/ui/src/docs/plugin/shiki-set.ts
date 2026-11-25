import { exactRegex } from '@rolldown/pluginutils'
import type { BundledLanguage, BundledTheme } from 'shiki'
import { bundledLanguagesInfo } from 'shiki/langs'
import { bundledThemesInfo } from 'shiki/themes'
import type { Plugin } from 'vite'

// The grammars and the themes that the Shiki worker of the docs can load.
// Shiki bundles more than 240 grammars and more than 60 themes, about 1.5 MB
// of gzip. No page loads one before it highlights a block, but the build writes
// each one as a chunk, and the bundle budget counts each chunk
// (`bundle-budget.test.ts`). The docs need a small part of them.
//
// The set is wide on purpose. The Markdown playground and the Chat demos
// highlight a fence of each language that a reader types, so the set holds the
// languages of the web stack, of the shells, and of configuration and data,
// and the frequent general languages. A grammar that is large for one language
// (C++, Ruby, PHP) stays out. A fence of a language that is not in the set
// shows as plain text, which is the fallback of `CodeBlock` for each failed
// highlight. `shiki-set.test.ts` makes sure that the set holds the language of
// each fence and each `CodeBlock` of the docs.
//
// The library does not change: `CodeBlock` in an app loads each grammar of
// Shiki. The build-time highlight of the examples (`highlight-worker.ts`) runs
// in Node, outside of this plugin, and it also loads each grammar.

/** The ids of the grammars that the docs bundle. Each alias of an id comes with it. */
export const DOCS_LANGUAGES = [
	// The web stack.
	'tsx',
	'jsx',
	'typescript',
	'javascript',
	'json',
	'jsonc',
	'html',
	'css',
	'scss',
	'markdown',
	'graphql',
	'vue',
	'svelte',
	'regexp',
	// The shells.
	'shellscript',
	'powershell',
	// Configuration and data.
	'yaml',
	'toml',
	'xml',
	'ini',
	'sql',
	'diff',
	'docker',
	// The general languages.
	'python',
	'go',
	'rust',
	'java',
	'kotlin',
	'swift',
	'c',
	'csharp',
] as const satisfies readonly BundledLanguage[]

/** The ids of the themes that the docs bundle: the default theme of `CodeBlock`, and its light pair. */
export const DOCS_THEMES = [
	'github-dark-default',
	'github-light-default',
] as const satisfies readonly BundledTheme[]

/** The entries of `info` whose `id` is in `ids`. An id that `info` does not have is an error. */
function pick<T extends { id: string }>(info: readonly T[], ids: readonly string[], kind: string) {
	const byId = new Map(info.map((entry) => [entry.id, entry]))

	return ids.map((id) => {
		const entry = byId.get(id)

		if (!entry) throw new Error(`docs: Shiki bundles no ${kind} \`${id}\``)

		return entry
	})
}

/**
 * The entries of `info` as the source of an array literal. Each entry keeps its
 * data, and its `import` loads the module `<pkg>/<id>`, as in the module of
 * Shiki. Thus the bundler writes a chunk for each entry, and for no other.
 */
function formatInfo(info: readonly { id: string; import: unknown }[], pkg: string): string {
	const entries = info.map(({ import: _, ...data }) => {
		const specifier = JSON.stringify(`${pkg}/${data.id}`)

		return `\t{ ...${JSON.stringify(data)}, import: () => import(${specifier}) },`
	})

	return `[\n${entries.join('\n')}\n]`
}

/** The source of `shiki/langs` with the grammars of {@link DOCS_LANGUAGES} only. It has each export of the module of Shiki. */
export function formatLanguages(): string {
	const info = formatInfo(pick(bundledLanguagesInfo, DOCS_LANGUAGES, 'grammar'), '@shikijs/langs')

	return `const bundledLanguagesInfo = ${info}
const bundledLanguagesBase = Object.fromEntries(bundledLanguagesInfo.map((i) => [i.id, i.import]))
const bundledLanguagesAlias = Object.fromEntries(bundledLanguagesInfo.flatMap((i) => i.aliases?.map((a) => [a, i.import]) ?? []))
const bundledLanguages = { ...bundledLanguagesBase, ...bundledLanguagesAlias }
export { bundledLanguages, bundledLanguagesAlias, bundledLanguagesBase, bundledLanguagesInfo }
`
}

/** The source of `shiki/themes` with the themes of {@link DOCS_THEMES} only. It has each export of the module of Shiki. */
export function formatThemes(): string {
	const info = formatInfo(pick(bundledThemesInfo, DOCS_THEMES, 'theme'), '@shikijs/themes')

	return `const bundledThemesInfo = ${info}
const bundledThemes = Object.fromEntries(bundledThemesInfo.map((i) => [i.id, i.import]))
export { bundledThemes, bundledThemesInfo }
`
}

/** The source of each module that the plugin replaces, by its import specifier. */
const SOURCES: Record<string, () => string> = {
	'shiki/langs': formatLanguages,
	'shiki/themes': formatThemes,
}

/**
 * The Vite plugin that gives `shiki/langs` and `shiki/themes` with the grammars
 * of {@link DOCS_LANGUAGES} and the themes of {@link DOCS_THEMES} only.
 *
 * @remarks
 * The plugin resolves each specifier as Vite does, and then gives its own
 * source for the module at that path. The module thus keeps the path of the
 * module of Shiki, and its imports of `@shikijs/langs` and `@shikijs/themes`
 * resolve from the folder of Shiki. Only the Shiki worker of `CodeBlock`
 * imports the two modules, so the plugin is a worker plugin of the build
 * (`worker.plugins` in `vite.config.ts`). The dev server does not use it.
 */
export function shikiSet(): Plugin {
	/** The resolved id of each module that the plugin replaces, with its source. */
	const replaced = new Map<string, () => string>()

	return {
		name: 'docs:shiki-set',
		enforce: 'pre',
		resolveId: {
			filter: { id: [exactRegex('shiki/langs'), exactRegex('shiki/themes')] },
			async handler(source, importer, options) {
				const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })

				const format = SOURCES[source]

				if (resolved && format) replaced.set(resolved.id, format)

				return resolved
			},
		},
		load(id) {
			return replaced.get(id)?.()
		},
	}
}
