import type { BrowserContextOptions, Page } from 'playwright'
import { inject, type TestContext } from 'vitest'
import { prerenderedPages } from '../../../../scripts/docs/build'
import { HYDRATED, STYLED } from '../../../../scripts/docs/probes'
import type { OpenTab } from './chromium'

/**
 * The path of each prerendered page of the shard: the root path, and each
 * page and tab of the docs. The shards take the pages in turn, so the pages of
 * a section, such as the charts, go to each shard.
 */
export function shardPaths(): string[] {
	const shard = inject('shard')

	return prerenderedPages().filter((_, index) => index % shard.count === shard.index - 1)
}

/**
 * Opens a tab with `options` that loads only from the server of the build. The
 * tab closes after the case. The cases run side by side, so the hook comes
 * from the context of the case.
 */
export async function openBuildTab(
	launch: OpenTab,
	options: BrowserContextOptions,
	context: TestContext,
): Promise<Page> {
	const origin = inject('docsOrigin')

	const tab = await launch(options, context)

	await tab.route(
		(url) => url.origin !== origin,
		(route) => route.abort(),
	)

	return tab
}

/**
 * Goes to the page at `route` of the build, and waits until it hydrates, its
 * full stylesheet loads, and its loads end.
 */
export async function loadBuildPage(tab: Page, route: string): Promise<void> {
	await tab.goto(`${inject('docsOrigin')}${route}`)

	await tab.waitForFunction(HYDRATED)

	await tab.waitForFunction(STYLED)

	await tab.waitForLoadState('networkidle')
}
