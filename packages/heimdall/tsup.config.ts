import { defineConfig } from 'tsup'

const shared = {
	format: ['esm'] as const,
	target: 'node22' as const,
	outDir: 'dist',
	dts: true,
	sourcemap: true,
	splitting: false,
	jsx: 'automatic' as const,
	jsxImportSource: 'react',
	external: ['next', 'react', 'react-dom', 'catalyst'],
}

export default defineConfig([
	{
		...shared,
		entry: {
			index: 'src/index.ts',
			config: 'src/config.ts',
			proxy: 'src/proxy.ts',
		},
		clean: true,
	},
	{
		...shared,
		entry: {
			pages: 'src/pages.ts',
		},
		clean: false,
		banner: {
			js: "'use client';",
		},
	},
])
