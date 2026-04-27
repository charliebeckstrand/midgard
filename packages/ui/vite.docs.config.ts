import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import {
	componentApiPlugin,
	componentTagsPlugin,
	demoMetasPlugin,
	derivedCodePlugin,
} from './src/docs/plugins'

export default defineConfig({
	base: '/',
	root: 'src/docs',
	plugins: [
		derivedCodePlugin(),
		componentTagsPlugin(),
		react(),
		tailwindcss(),
		componentApiPlugin(),
		demoMetasPlugin(),
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
	},
})
