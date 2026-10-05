import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { reactDocs } from './plugin/index.ts'

// The docs of ui: `pnpm --filter ui dev` serves them, and `docs:build`
// prerenders them to `dist/client`.
export default defineConfig({
	// The root is this folder for each command, also for the preview server
	// that the prerender starts from the package folder.
	root: import.meta.dirname,
	plugins: [reactDocs(), tailwindcss(), reactRouter()],
	server: {
		port: 3456,
		// Transform the shell on server start, so the first page does not wait for it.
		warmup: { clientFiles: ['./app/root.tsx', './app/sidebar.tsx', './kit/index.ts'] },
	},
	// The dependency scan starts from each module of the app and from the Shiki
	// worker of `CodeBlock`, which no import reaches. Left to discovery, Vite
	// finds the packages of a page on its first visit, bundles again, and
	// reloads the page.
	optimizeDeps: {
		entries: [
			'app/**/*.tsx',
			'kit/**/*.tsx',
			'pages/**/*.tsx',
			'../components/code/code-shiki-worker.ts',
		],
	},
	build: { target: 'esnext' },
	// The client build puts React and the router in one chunk, the shell with
	// each module that it imports in one more chunk, and the kit with each
	// module that it imports in a third. Thus a page loads a few large chunks
	// and not many small ones, and it makes fewer requests. A lazy module, such
	// as the sheet of the Event log, then finds the modules that it shares with
	// the kit in the kit chunk, and the build splits no small chunk from them.
	// The API entry stays out of the kit chunk, because it loads on demand. The
	// code of each page stays in the chunks of that page.
	environments: {
		client: {
			build: {
				rolldownOptions: {
					output: {
						codeSplitting: {
							groups: [
								{
									name: 'framework',
									test: /node_modules[\\/](?:react|react-dom|react-router)[\\/]/,
									priority: 2,
								},
								{
									name: 'shell',
									test: /[\\/]src[\\/]docs[\\/]app[\\/]root\.tsx$/,
									priority: 1,
								},
								{
									name: 'kit',
									test: /[\\/]src[\\/]docs[\\/]kit[\\/](?!api-entry)/,
									priority: 0,
								},
							],
						},
					},
				},
			},
		},
	},
	// The Shiki worker of `CodeBlock` needs the `es` format (see `CodeBlock`).
	worker: { format: 'es' },
	// Tailwind runs through its Vite plugin. The `postcss.config.mjs` of the
	// repository is for the Next.js apps, so Vite does not look for one.
	css: { postcss: { plugins: [] } },
})
