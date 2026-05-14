import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		auth: 'src/auth/index.ts',
		chat: 'src/chat/index.ts',
	},
	format: ['esm'],
	target: 'node22',
	outDir: 'dist',
	clean: true,
	dts: true,
	sourcemap: false,
	splitting: false,
	banner: { js: "'use client'" },
	external: [
		'next',
		'react',
		'react-dom',
		'auth',
		'ui',
		'@heroicons/react',
		'react-textarea-autosize',
		'eventsource-parser',
	],
})
