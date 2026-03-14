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
	external: ['next', 'react', 'react-dom', 'catalyst', 'reactbits', '@heroicons/react'],
}

export default defineConfig([
	{
		...shared,
		entry: {
			'use-form': 'src/hooks/use-form.ts',
		},
		clean: true,
	},
	{
		...shared,
		entry: {
			'login-page': 'src/components/login-page.tsx',
			'register-page': 'src/components/register-page.tsx',
			'password-input': 'src/components/password-input.tsx',
		},
		clean: false,
		banner: {
			js: "'use client';",
		},
	},
])
