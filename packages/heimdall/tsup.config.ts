import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		session: 'src/session.ts',
		config: 'src/config.ts',
		proxy: 'src/proxy.ts',
	},
	format: ['esm'],
	target: 'node22',
	outDir: 'dist',
	clean: true,
	dts: true,
	sourcemap: true,
	splitting: false,
	external: ['next', 'react'],
})
