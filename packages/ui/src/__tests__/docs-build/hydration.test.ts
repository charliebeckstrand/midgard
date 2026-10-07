import { type Browser, chromium, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, inject, it, onTestFinished } from 'vitest'
import { HYDRATED } from '../../../scripts/docs-server'

// The build renders each page to HTML on the server, and the browser hydrates
// it. When the client renders different markup, React reports a recoverable
// error and renders the page again on the client. A store that reads browser
// state with no server snapshot is one cause. No test without a build sees
// this, so this file loads prerendered pages of the build in Chromium.
//
// A tab that the browser restores from its cache after a deploy can name a
// chunk that is not in the build. Such a page must reload one time, and no
// more.

/**
 * The home page, component pages, a module page, a page with a tab in its
 * path, and a path with no page.
 */
const PAGES = [
	'/',
	'/button',
	'/accordion',
	'/modules/grid',
	'/modules/grid/sorting',
	'/no-such-page',
]

/**
 * The chunks that a stale page names. A missing `page` chunk stops the module
 * script of the page. A missing `entry.client` chunk stops the import that
 * the module script starts.
 */
const STALE_CHUNKS = ['page', 'entry.client']

const origin = inject('docsOrigin')

let browser: Browser

beforeAll(async () => {
	browser = await chromium.launch()
})

afterAll(async () => {
	await browser?.close()
})

/** Opens a tab at the width of a phone. The tab closes after the case, also after a timeout. */
async function openTab(): Promise<Page> {
	const tab = await browser.newPage({ viewport: { width: 390, height: 844 } })

	onTestFinished(() => tab.close())

	return tab
}

/**
 * Loads `/button` with HTML that names a missing `chunk` for the first
 * `staleLoads` loads of the document, and waits up to `wait` ms for
 * hydration. Gives whether the page hydrated and how many times the document
 * loaded.
 */
async function loadStale(
	chunk: string,
	staleLoads: number,
	wait: number,
): Promise<{ hydrated: boolean; loads: number }> {
	const tab = await openTab()

	const url = `${origin}/button`

	const name = new RegExp(`/assets/${chunk.replace('.', '\\.')}-[\\w-]+\\.js`, 'g')

	let loads = 0

	await tab.route(url, async (route) => {
		loads++

		const response = await route.fetch()

		const html = await response.text()

		const body = loads <= staleLoads ? html.replace(name, `/assets/${chunk}-stale.js`) : html

		await route.fulfill({ response, body })
	})

	await tab.goto(url)

	const hydrated = await tab
		.waitForFunction(HYDRATED, undefined, { timeout: wait })
		.then(() => true)
		.catch(() => false)

	// A second reload, if any, comes after the first one.
	await tab.waitForLoadState('networkidle')

	return { hydrated, loads }
}

describe('a prerendered page of the docs build', () => {
	it.each(PAGES)('%s hydrates with no error', async (path) => {
		const tab = await openTab()

		const errors: string[] = []

		tab.on('pageerror', (error) => errors.push(error.message))

		tab.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text())
		})

		await tab.goto(`${origin}${path}`)

		await tab.waitForFunction(HYDRATED)

		// A recoverable error comes after the first commit, so wait for the page to settle.
		await tab.waitForLoadState('networkidle')

		expect(errors).toEqual([])
	})
})

describe('a page whose HTML names a chunk that is not in the build', () => {
	it.each(STALE_CHUNKS)('reloads one time and hydrates, for a missing %s chunk', async (chunk) => {
		expect(await loadStale(chunk, 1, 10_000)).toEqual({ hydrated: true, loads: 2 })
	})

	// A build that stays broken gets one reload, not a loop.
	it.each(STALE_CHUNKS)(
		'reloads one time only, when each load misses the %s chunk',
		async (chunk) => {
			const { loads } = await loadStale(chunk, Number.POSITIVE_INFINITY, 3000)

			expect(loads).toBe(2)
		},
	)
})
