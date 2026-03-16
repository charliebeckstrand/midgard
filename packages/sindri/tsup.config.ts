import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/*.{ts,tsx}'],
	format: ['esm'] as const,
	target: 'node22' as const,
	outDir: 'dist',
	dts: true,
	sourcemap: true,
	splitting: false,
	external: ['next', 'react', 'react-dom', 'catalyst', 'reactbits', '@heroicons/react'],
})
