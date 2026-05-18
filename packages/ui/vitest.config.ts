import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { componentTagsPlugin } from './src/docs/plugins'
import { baseTest } from './vitest.base.config'

// Stub the docs-only virtual modules so vite's dependency scanner can resolve
// them when it crawls src/docs/registry.ts. The real plugins
// (componentApiPlugin, demoMetasPlugin) only run during the docs build —
// parsePackage builds a TS program over the whole package, which is wasted
// work for tests that never touch the registry.
function virtualDocsStubsPlugin(): Plugin {
	const ids = new Set(['virtual:component-api', 'virtual:demo-metas'])

	return {
		name: 'virtual-docs-stubs',
		resolveId(id) {
			if (ids.has(id)) return `\0${id}`
		},
		load(id) {
			if (id.startsWith('\0') && ids.has(id.slice(1))) return 'export default {}'
		},
	}
}

export default defineConfig({
	plugins: [componentTagsPlugin(), virtualDocsStubsPlugin()],
	test: {
		...baseTest,
		pool: 'vmThreads',
		sequence: { shuffle: true },
		setupFiles: ['./src/__tests__/setup.ts'],
		include: ['src/__tests__/**/*.test.{ts,tsx}'],
		reporters: process.env.CI ? ['default', 'junit'] : ['default'],
		outputFile: {
			junit: 'test-results/junit.xml',
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'cobertura'],
			reportsDirectory: 'coverage',
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/__tests__/**', 'src/docs/**', 'src/index.ts'],
		},
	},
})
