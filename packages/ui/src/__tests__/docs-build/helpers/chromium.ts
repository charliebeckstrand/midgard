import { type Browser, type BrowserContextOptions, chromium, type Page } from 'playwright'
import { afterAll, beforeAll, onTestFinished, type TestContext } from 'vitest'

/** Opens a tab with `options`. The tab closes after the case. */
type OpenTab = (options?: BrowserContextOptions, context?: TestContext) => Promise<Page>

/**
 * Launches Chromium before the cases of the file, and closes it after them.
 *
 * @remarks
 * Call it one time, at the top level of a file. It registers the hooks, and
 * gives the function that opens a tab.
 *
 * The tab closes in `onTestFinished`, so it also closes after a timeout. A
 * case that runs side by side with other cases gives its `TestContext`. The
 * close then binds to the hook of that case.
 *
 * @returns The function that opens a tab in the browser of the file.
 *
 * @example
 * ```typescript
 * const openTab = launchChromium()
 *
 * const tab = await openTab({ viewport: { width: 1280, height: 720 } })
 * ```
 */
export function launchChromium(): OpenTab {
	let browser: Browser | undefined

	beforeAll(async () => {
		browser = await chromium.launch()
	})

	afterAll(async () => {
		await browser?.close()
	})

	return async (options, context) => {
		if (!browser) throw new Error('Chromium did not launch.')

		const tab = await browser.newPage(options)

		const onFinished = context?.onTestFinished ?? onTestFinished

		onFinished(() => tab.close())

		return tab
	}
}
