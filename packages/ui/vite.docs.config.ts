import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import {
	componentApiPlugin,
	componentTagsPlugin,
	demoMetasPlugin,
	deriveCodePlugin,
} from './src/docs/plugins'

const analyze = process.env.ANALYZE === '1'

export default defineConfig({
	base: '/',
	root: 'src/docs',
	plugins: [
		deriveCodePlugin(),
		componentTagsPlugin(),
		react(),
		tailwindcss(),
		componentApiPlugin(),
		demoMetasPlugin(),
		analyze &&
			visualizer({
				// Filenames are resolved against the process cwd, not the Vite root,
				// so this lands next to the build output at src/docs/dist/.
				filename: 'src/docs/dist/stats.html',
				template: 'treemap',
				gzipSize: true,
				brotliSize: true,
				sourcemap: true,
			}),
	],
	server: { port: 3456 },
	resolve: {
		alias: [
			// Use the web bundle (web-relevant languages only) instead of all ~300 grammars.
			// The public CodeBlock component still references 'shiki' — this alias only
			// affects the docs build. Regex ensures shiki/wasm etc. are not rewritten.
			{ find: /^shiki$/, replacement: 'shiki/bundle/web' },
		],
	},
	build: {
		target: 'esnext',
		sourcemap: analyze,
	},
	// Tailwind runs via `@tailwindcss/vite` above; the docs site never needs the
	// root `postcss.config.mjs` (which targets Next.js apps). Skip the search so
	// prod builds don't fail on vendor CSS like maplibre-gl.css.
	css: {
		postcss: { plugins: [] },
	},
})
