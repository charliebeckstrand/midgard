import { defineConfig } from 'vitest/config'
import { docsPlugin } from './src/plugins'

// Agnostic: the engine's own suite uses synthetic fixtures and never scans a
// real component library. The plugin runs only to make the `virtual:*` modules
// resolvable; its scan output is unused by these tests. Library-specific
// integration (does the engine document *ui* correctly?) lives in that library.
export default defineConfig({
	plugins: [docsPlugin({ vitest: true })],
	test: {
		environment: 'jsdom',
		globals: true,
		css: false,
		include: ['src/__tests__/**/*.test.{ts,tsx}'],
		setupFiles: ['./src/__tests__/setup.ts'],
	},
})
