import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'

// The fixture sheets of ui, under src/docs/fixtures: one page for each family
// of components, for the weekly Percy run. The sheets are apart from the docs
// pages, so an edit to a docs page does not change a snapshot.
export default {
	base: '/',
	root: 'src/docs/fixtures',
	plugins: [react(), tailwindcss()],
	build: { target: 'esnext' },
	// The Shiki worker of `CodeBlock` needs the `es` format (see `CodeBlock`).
	worker: { format: 'es' },
} satisfies UserConfig
