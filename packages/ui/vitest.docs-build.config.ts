import { defineConfig } from 'vitest/config'

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
 * (`scripts/docs-server.ts`), and gives its origin to the tests.
 */
export default defineConfig({
	test: {
		name: 'docs-build',
		environment: 'node',
		include: ['src/__tests__/docs-build/**/*.test.ts'],
		globalSetup: ['./src/__tests__/docs-build/setup/serve.ts'],
		// A page load in Chromium takes about one second. Each wait of Playwright
		// has a limit of 30 s, so a page that does not hydrate fails with the
		// error of Playwright, before the limit of the case.
		testTimeout: 60_000,
		hookTimeout: 60_000,
	},
})
