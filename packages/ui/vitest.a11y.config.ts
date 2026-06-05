import { defineConfig } from 'vitest/config'
import { componentTagsPlugin, virtualStubsPlugin } from './src/docs/plugins'
import { baseTest } from './vitest.base.config'

// One-off a11y score benchmark (`pnpm a11y:score`). Mirrors the plugins, pool,
// and setup files of vitest.config.ts so components render identically to the
// axe gate — only the include differs, isolating the score runner from the
// normal `*.test.{ts,tsx}` suite.
export default defineConfig({
	plugins: [componentTagsPlugin(), virtualStubsPlugin()],
	test: {
		...baseTest,
		pool: 'vmThreads',
		setupFiles: ['./src/__tests__/setup/index.ts', './src/__tests__/setup/module-mocks.ts'],
		include: ['src/__tests__/a11y/score.ts'],
		// Scoring every component's demo runs axe hundreds of times; the default
		// 5s test timeout is far too tight for a one-off benchmark.
		testTimeout: 180_000,
		// The printed table is the deliverable, so let it reach stdout directly
		// rather than being buffered and hidden under the passing test.
		disableConsoleIntercept: true,
	},
})
