import { defineConfig } from 'tsup'

export default defineConfig({
	entry: { 'shiny-text': 'src/shiny-text.tsx' },
	format: ['esm'],
	target: 'node22',
	outDir: 'dist',
	clean: true,
	dts: true,
	sourcemap: true,
	splitting: false,
	jsx: 'automatic',
	jsxImportSource: 'react',
})
