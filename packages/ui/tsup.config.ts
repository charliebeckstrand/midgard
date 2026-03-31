import { defineConfig } from 'tsup'
import pkg from './package.json'

/** Derive entry points from package.json exports — single source of truth */
const entry = Object.fromEntries(
	Object.entries(pkg.exports).map(([key, value]) => [
		key === '.' ? 'index' : key.slice(2),
		(value as { default: string }).default,
	]),
)

export default defineConfig({
	entry,
	format: ['esm'],
	target: 'es2022',
	outDir: 'dist',
	clean: true,
	dts: false,
	sourcemap: true,
	splitting: true,
	banner: { js: "'use client'" },
})
