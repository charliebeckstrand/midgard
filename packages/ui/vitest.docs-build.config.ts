import { defineConfig } from 'vitest/config'
import { splitSequencer } from './src/__tests__/setup/split-sequencer'

/**
 * The suite of the docs build (src/__tests__/docs-build/). It reads the output
 * of `docs:build`, so it runs apart from the other suites and after the build.
 * The turbo task `test:docs-build` builds the docs app first:
 *
 * ```sh
 * pnpm turbo run test:docs-build --filter=ui
 * ```
 *
 * The global setup serves the build with the paths of App Platform
 * (`scripts/docs-server.ts`), and gives its origin to the tests. CI runs the
 * suite in shards (`--shard`). The axe file holds most of the time of the
 * suite, so each shard runs it, and the file reads only its part of the pages
 * (`setup/shard.ts`). The shards divide the other files.
 */
export default defineConfig({
	test: {
		name: 'docs-build',
		environment: 'node',
		include: ['src/__tests__/docs-build/**/*.test.ts'],
		globalSetup: ['./src/__tests__/setup/shard.ts', './src/__tests__/docs-build/setup/serve.ts'],
		sequence: { sequencer: splitSequencer(['accessibility.test.ts']) },
		// Each wait of Playwright has a limit of 30 s, far longer than a page load
		// in Chromium, so a page that does not hydrate fails with the error of
		// Playwright, before the limit of the case.
		testTimeout: 60_000,
		hookTimeout: 60_000,
	},
})
