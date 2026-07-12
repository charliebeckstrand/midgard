import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: { port: 3457 },
	build: { target: 'esnext' },
	// Tailwind runs via `@tailwindcss/vite`; the root `postcss.config.mjs`
	// targets the Next.js apps and must not leak into this build.
	css: {
		postcss: { plugins: [] },
	},
})
