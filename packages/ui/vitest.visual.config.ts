import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import { docsPlugin } from './src/docs/engine/plugins'
import { servedTailwind } from './vitest.browser.config'

/**
 * The visual suite (`pnpm test:visual`): one screenshot of each demo page of the
 * docs site, compared with a reference image. It is manual. CI does not run it,
 * and the `Visual` workflow runs it on request. Run it with `-u` to write the
 * references again after an intended change.
 *
 * - The references are the renders of Chromium on Linux, and their names end in
 *   `-chromium-linux.png`. Another platform renders text differently, so a run
 *   there writes new references and fails. Write the references on Linux: in
 *   the `Visual` workflow, or in a Linux container.
 *
 * - `docsPlugin({ vitest: true })` gives the demos the real component map. It
 *   gives no API reference, so a page shows the demo only, and a change to
 *   TSDoc changes no screenshot.
 *
 * - The browser context prefers reduced motion. Each animation that honors
 *   that preference stops, and a screenshot of it is stable. `ShinyText`, for
 *   example, does not sweep.
 *
 * - The page renders the demos in a sequence, and a failure shows an image of
 *   the difference under `.vitest-attachments/`. Git ignores that folder.
 */
export default defineConfig({
	plugins: [servedTailwind(), docsPlugin({ vitest: true })],
	test: {
		include: ['src/__tests__/visual/**/*.test.{ts,tsx}'],
		testTimeout: 30_000,
		browser: {
			enabled: true,
			provider: playwright({ contextOptions: { reducedMotion: 'reduce' } }),
			headless: true,
			screenshotFailures: false,
			viewport: { width: 1280, height: 800 },
			instances: [{ browser: 'chromium', name: 'visual' }],
		},
	},
})
