import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		config: 'src/config.ts',
		proxy: 'src/proxy.ts',
		session: 'src/session.ts',
		user: 'src/user.ts',
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
