import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import type { UserConfig } from 'vite'
import { docsPlugin } from '../plugins'

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
	 * Vite root — the directory holding `app.css`, the React Router app in
	 * `app/`, and the `demos/` tree.
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
 * the plugin, React, Tailwind, and the bundle visualizer (under `ANALYZE=1`).
 * The consumer supplies only its `packageName` and, if non-standard, its
 * `root`.
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
			reactRouter(),
			tailwindcss(),
			analyze && {
				...visualizer({
					// Filenames resolve against the process cwd, not the Vite root, so
					// this lands next to the build output at <root>/dist/.
					filename: `${root}/dist/stats.html`,
					template: 'treemap',
					gzipSize: true,
					brotliSize: true,
					sourcemap: true,
				}),
				// The server build runs after the client build and writes the same
				// file. The report shows the client bundle only.
				applyToEnvironment: (environment) => environment.name === 'client',
			},
		],
		server: {
			port: 3456,
			// Transform the entry graph (the root, the chrome, the providers) on
			// server start, so the first page paints without an on-demand transform
			// stall. The root links `app.css` with a `?url` import, so it is not in
			// the module graph, and it blocks the paint. It is warmed too.
			warmup: { clientFiles: ['./app/root.tsx', './app.css'] },
		},
		// Pre-bundle the heavy component deps up front. Left to lazy discovery,
		// Vite finds each the first time a demo importing it renders and re-runs
		// the optimizer, which triggers a full-page reload mid-session — the same
		// failure the vitest browser config guards against. The Shiki worker of
		// `CodeBlock` imports `shiki/core`, the engine, and the maps of the
		// grammars and the themes, so they are listed here.
		optimizeDeps: {
			include: [
				'@dnd-kit/core',
				'@dnd-kit/sortable',
				'@dnd-kit/utilities',
				'@floating-ui/react',
				'@tanstack/react-table',
				'@tanstack/react-table/static-functions',
				'@tanstack/react-virtual',
				'lucide-react',
				'motion',
				'motion/react',
				'shiki/core',
				'shiki/engine/javascript',
				'shiki/langs',
				'shiki/themes',
				// Reached only through lazy demo chunks, so the scanner misses them and
				// the first navigation to a map, date, markdown, payment, export, or
				// shortcut demo triggers an optimizer re-run and the mid-session full
				// reload this list exists to prevent.
				'@internationalized/date',
				'card-validator',
				'd3-geo',
				'fflate',
				'marked',
				'tinykeys',
				'topojson-client',
			],
		},
		build: {
			target: 'esnext',
			sourcemap: analyze,
			rolldownOptions: {
				output: {
					// A stable home for the vendors many chunks share. Without this the
					// bundler places them by its own heuristics, so they migrate between
					// chunks as demos change and a returning visitor re-downloads code
					// that did not change — the cost is cache churn, not bytes.
					//
					// Deliberately only the four that are genuinely cross-cutting.
					// Grouping a tree-shaken package like `lucide-react` would be a
					// pessimization: a page needing one icon would fetch every icon the
					// site uses.
					codeSplitting: {
						groups: [
							{ name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
							// `motion` is a re-export shim; the runtime it forwards to lives in
							// `framer-motion`, `motion-dom`, and `motion-utils`. Matching the
							// shim alone leaves the runtime glued to whichever app chunk pulls
							// it — which for this site is `primitives/mount`, so every edit
							// there would re-hash all of framer-motion.
							{
								name: 'vendor-motion',
								test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/,
							},
							{ name: 'vendor-floating-ui', test: /node_modules[\\/]@floating-ui[\\/]/ },
							{ name: 'vendor-tanstack', test: /node_modules[\\/]@tanstack[\\/]/ },
							// Each page is a route of its own, so the bundler splits the code that
							// pages share into a chunk for each set of pages that import it. The
							// code of ui that many pages share goes into one chunk instead.
							{ name: 'ui', test: /[\\/]src[\\/](?!docs[\\/]demos[\\/])/, minShareCount: 24 },
						],
					},
				},
			},
		},
		// The Shiki worker of `CodeBlock` loads each grammar and each theme as a
		// lazy chunk. The default `iife` format cannot split a worker, so it puts
		// every grammar and every theme into one worker file of about 9.5 MB.
		worker: { format: 'es' },
		// Tailwind runs via `@tailwindcss/vite` above; the docs site never needs
		// the root `postcss.config.mjs` (which targets Next.js apps). Skip the
		// search so prod builds don't fail on vendor CSS.
		css: {
			postcss: { plugins: [] },
		},
	}
}
