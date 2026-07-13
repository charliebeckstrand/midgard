import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import type { UserConfig } from 'vite'
import { docsPlugin } from '../plugins'

// Curated `shiki/core` shim (tsx, typescript, bash + github-dark-default, JS
// regex engine) that replaces the bare `shiki` specifier in the docs build.
const shikiCore = fileURLToPath(new URL('../shiki.ts', import.meta.url))

export { docsPlugin } from '../plugins'
export type { DocsPluginOptions } from '../plugins/docs'

/** Options a consuming library passes to {@link defineDocsConfig}. */
export type DocsConfigOptions = {
	/**
	 * The documented library's import prefix (`ui`, `grid`, `charts`). Derived
	 * code snippets read `<packageName>/button`.
	 */
	packageName: string
	/**
	 * Vite root — the directory holding `index.html`, the entry `main.tsx`, and
	 * the `demos/` tree.
	 *
	 * @defaultValue `'src/docs'`
	 */
	root?: string
	/**
	 * Override the source-root auto-detection (the directory containing
	 * `components/`). By default it is located relative to {@link root}.
	 */
	srcDir?: string
}

/**
 * Build the Vite config for a library's docs site. The shared engine supplies
 * the plugin, React, Tailwind, the curated Shiki-core alias, and the bundle
 * visualizer (under `ANALYZE=1`); the consumer supplies only its
 * `packageName` and, if non-standard, its `root`.
 *
 * ```ts
 * // packages/ui/vite.docs.config.ts
 * import { defineDocsConfig } from './src/docs/engine/vite'
 *
 * export default defineDocsConfig({ packageName: 'ui' })
 * ```
 */
export function defineDocsConfig({
	packageName,
	root = 'src/docs',
	srcDir,
}: DocsConfigOptions): UserConfig {
	const analyze = process.env.ANALYZE === '1'

	return {
		base: '/',
		root,
		plugins: [
			docsPlugin({ packageName, srcDir }),
			react(),
			tailwindcss(),
			analyze &&
				visualizer({
					// Filenames resolve against the process cwd, not the Vite root, so
					// this lands next to the build output at <root>/dist/.
					filename: `${root}/dist/stats.html`,
					template: 'treemap',
					gzipSize: true,
					brotliSize: true,
					sourcemap: true,
				}),
		],
		server: { port: 3456 },
		resolve: {
			alias: [
				// Redirect the bare `shiki` specifier to a curated `shiki/core` build
				// (three grammars, one theme, JS regex engine) instead of the ~50-grammar,
				// ~30-theme web bundle with its 622 kB oniguruma-wasm chunk. The public
				// CodeBlock component still references 'shiki' — this alias only affects
				// the docs build. The anchored regex leaves shiki/core, shiki/langs/*,
				// etc. (which the shim itself imports) untouched.
				{ find: /^shiki$/, replacement: shikiCore },
			],
		},
		build: {
			target: 'esnext',
			sourcemap: analyze,
		},
		// Tailwind runs via `@tailwindcss/vite` above; the docs site never needs
		// the root `postcss.config.mjs` (which targets Next.js apps). Skip the
		// search so prod builds don't fail on vendor CSS.
		css: {
			postcss: { plugins: [] },
		},
	}
}
