import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'
import type { ExtraDefaults } from './extractor'
import { docsPlugin } from './plugin'

export type { DocsPluginOptions } from './plugin'
export { docsPlugin } from './plugin'

/** Options a consuming library passes to {@link defineDocsConfig}. */
export type DocsConfigOptions = {
	/**
	 * The documented library's import prefix (`ui`, `grid`, `charts`). Drives
	 * module derivation for `content/<category>/<name>.md` docs.
	 */
	packageName: string

	/**
	 * Vite root — the directory holding `index.html`, the entry `main.tsx`, and
	 * the `content/` tree.
	 *
	 * @defaultValue 'src/docs'
	 */
	root?: string

	/** Doc markdown directory, relative to {@link root}. @defaultValue 'content' */
	contentDir?: string

	/** Dev-server port. @defaultValue 3456 */
	port?: number

	/**
	 * Absolute path to the documented package, enabling `virtual:docs/api`
	 * extraction. Omitted, the api module serves an empty snapshot.
	 */
	apiPackageDir?: string

	/** Supplies extra component prop defaults (e.g. a design system's variant axes) to the extractor. */
	extraDefaults?: ExtraDefaults
}

/**
 * Build the Vite config for a library's docs site. The engine supplies the
 * docs plugin, React, Tailwind, and the Shiki web-bundle alias; the consumer
 * supplies its `packageName` and, if non-standard, its `root`.
 *
 * ```ts
 * // packages/ui/vite.docs.config.ts
 * import { defineDocsConfig } from 'docs/vite'
 *
 * export default defineDocsConfig({ packageName: 'ui', apiPackageDir: import.meta.dirname })
 * ```
 */
export function defineDocsConfig({
	packageName,
	root = 'src/docs',
	contentDir = 'content',
	port = 3456,
	apiPackageDir,
	extraDefaults,
}: DocsConfigOptions): UserConfig {
	return {
		base: '/',
		root,
		plugins: [
			docsPlugin({ contentDir, packageName, apiPackageDir, extraDefaults }),
			react(),
			tailwindcss(),
		],
		server: { port },
		resolve: {
			alias: [
				// Use the web bundle (web-relevant languages only) instead of all ~300
				// grammars. The public CodeBlock component still references 'shiki' —
				// this alias only affects the docs build. Regex ensures shiki/wasm etc.
				// are not rewritten.
				{ find: /^shiki$/, replacement: 'shiki/bundle/web' },
			],
		},
		build: { target: 'esnext' },
		// Tailwind runs via `@tailwindcss/vite` above; the docs site never needs
		// the root `postcss.config.mjs` (which targets Next.js apps). Skip the
		// search so prod builds don't fail on vendor CSS.
		css: {
			postcss: { plugins: [] },
		},
	}
}
