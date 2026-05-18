import { defineConfig } from 'vitest/config'
import { componentTagsPlugin } from './src/docs/plugins'
import { baseTest } from './vitest.base.config'

export default defineConfig({
	plugins: [componentTagsPlugin()],
	test: {
		...baseTest,
		pool: 'vmThreads',
		sequence: { shuffle: true },
		onConsoleLog: (log) => {
			// React 19 reports stray post-test updates from libraries we don't
			// own (floating-ui hover delays, motion mocks). The real signal
			// would be a failed assertion, not a console line.
			if (log.includes('was not wrapped in act(')) return false
		},
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
