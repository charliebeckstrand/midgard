import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/*.{ts,tsx}'],
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
