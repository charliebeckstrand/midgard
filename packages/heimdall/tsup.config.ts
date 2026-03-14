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
			session: 'src/session.ts',
			config: 'src/config.ts',
			proxy: 'src/proxy.ts',
		},
		clean: true,
	},
	{
		...shared,
		entry: {
			'login-page': 'src/login-page.tsx',
			'register-page': 'src/register-page.tsx',
			'password-input': 'src/password-input.tsx',
		},
		clean: false,
		banner: {
			js: "'use client';",
		},
	},
])
