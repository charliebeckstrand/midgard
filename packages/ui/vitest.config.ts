import { defineConfig } from 'vitest/config'
import { componentTagsPlugin } from './src/docs/plugins'
import { baseTest } from './vitest.base.config'

export default defineConfig({
	plugins: [componentTagsPlugin()],
	test: {
		...baseTest,
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
