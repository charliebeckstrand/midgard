import { defineConfig } from 'vitest/config'
import { BaseSequencer, type TestSpecification } from 'vitest/node'

/** The test file that `--shard` divides by page. */
const AXE_FILE = 'accessibility.test.ts'

/**
 * Divides the suite for `--shard`. The axe file holds most of the time of the
 * suite, and a shard of whole files puts it on one shard. So each shard runs
 * the axe file, and the file reads only its part of the pages (`docsShard`
 * of `setup/serve.ts`). The first shard also runs the other files, which take
 * about 16 s together.
 */
class DocsBuildSequencer extends BaseSequencer {
	override async shard(files: TestSpecification[]): Promise<TestSpecification[]> {
		if (this.ctx.config.shard?.index === 1) return files

		return files.filter((file) => file.moduleId.endsWith(AXE_FILE))
	}
}

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
 * suite in two shards (`--shard`), and {@link DocsBuildSequencer} divides it.
 */
export default defineConfig({
	test: {
		name: 'docs-build',
		environment: 'node',
		include: ['src/__tests__/docs-build/**/*.test.ts'],
		globalSetup: ['./src/__tests__/docs-build/setup/serve.ts'],
		sequence: { sequencer: DocsBuildSequencer },
		// A page load in Chromium takes about one second. Each wait of Playwright
		// has a limit of 30 s, so a page that does not hydrate fails with the
		// error of Playwright, before the limit of the case.
		testTimeout: 60_000,
		hookTimeout: 60_000,
	},
})
