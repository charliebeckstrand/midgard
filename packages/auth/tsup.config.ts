import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'app-config': 'src/app-config.ts',
		config: 'src/config.ts',
		proxy: 'src/proxy.ts',
	},
	format: ['esm'],
	target: 'node22',
	outDir: 'dist',
	clean: true,
	sourcemap: false,
	splitting: false,
	external: ['next', 'react'],
})
