import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts', 'src/*/index.ts'],
	format: ['esm'] as const,
	target: 'node22' as const,
	outDir: 'dist',
	dts: true,
	sourcemap: true,
	splitting: false,
	external: [
		'next',
		'react',
		'react-dom',
		'catalyst',
		'reactbits',
		'@heroicons/react',
		'react-textarea-autosize',
	],
})
