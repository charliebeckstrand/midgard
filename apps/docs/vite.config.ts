import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { docsPlugin } from './src/engine/plugin'

export default defineConfig({
	plugins: [docsPlugin(), react(), tailwindcss()],
	server: { port: 3457 },
	resolve: {
		alias: [
			// Use the web bundle (web-relevant languages only) instead of all ~300
			// grammars. The public CodeBlock component still references 'shiki' —
			// this alias only affects this build. Regex ensures shiki/wasm etc. are
			// not rewritten.
			{ find: /^shiki$/, replacement: 'shiki/bundle/web' },
		],
	},
	build: { target: 'esnext' },
	// Tailwind runs via `@tailwindcss/vite`; the root `postcss.config.mjs`
	// targets the Next.js apps and must not leak into this build.
	css: {
		postcss: { plugins: [] },
	},
})
