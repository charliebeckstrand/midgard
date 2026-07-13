import { defineConfig } from 'tsup'

// The vite/extractor entries load in Node (a consumer's vite.config); the
// engine entry is browser-safe. Dependencies stay external so the extractor's
// `typescript-6` alias resolves from this package's own node_modules — the
// whole point of the ts6/ts7 split.
export default defineConfig({
	entry: {
		engine: 'src/engine/index.ts',
		extractor: 'src/extractor/index.ts',
		adapters: 'src/adapters/index.ts',
		vite: 'src/vite/index.ts',
		scan: 'src/vite/scan.ts',
	},
	format: ['esm'],
	target: 'node22',
	outDir: 'dist',
	clean: true,
	dts: false,
	sourcemap: false,
	splitting: true,
})
