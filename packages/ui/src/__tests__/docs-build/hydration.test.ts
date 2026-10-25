import { type Browser, chromium, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, inject, it, onTestFinished } from 'vitest'
import { HYDRATED } from '../../../scripts/docs-server'
import { LOCALES } from '../../docs/app/language'

// The build renders each page to HTML on the server, and the browser hydrates
// it. When the client renders different markup, React reports a recoverable
// error and renders the page again on the client. A store that reads browser
// state with no server snapshot is one cause. No test without a build sees
// this, so this file loads prerendered pages of the build in Chromium.
//
// A tab that the browser restores from its cache after a deploy can name a
// chunk that is not in the build. Such a page must reload one time, and no
// more. A page whose files all come from the cache hydrates, but a deploy
// removed its other chunks. Such a page must also reload one time, at the
// start or when the reader comes back to the tab.
//
// WebKit keeps a module file that failed to load for the life of the tab, so
// a reload uses the failed copy again. Thus a failed load fetches the module
// files of the page again with `cache: 'reload'`, which replaces that copy.
// Chromium does not keep the copy, so these cases check the new fetches, not
// the recovery in WebKit.
//
// The server sends the HTML of each page in the language of the reader
// (`scripts/docs-server.ts`), and the page hydrates in that language. So the
// text of a page in each translated language stays after hydration.

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

/**
 * Opens a tab at the width of a phone, with the browser languages of `locale`.
 * The tab closes after the case, also after a timeout.
 */
async function openTab(locale = 'en-US'): Promise<Page> {
	const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, locale })

	onTestFinished(() => tab.close())

	return tab
}

/**
 * A script that keeps the text of the page as its HTML gives it, before the
 * page scripts run, in `data-text` of the root element. It is the source of an
 * init script, which runs in the page, not in the case.
 */
const KEEP_HTML_TEXT = `document.addEventListener('DOMContentLoaded', () => {
	document.documentElement.dataset.text = document.body.innerText
})`

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

describe.each(LOCALES.slice(1))('a prerendered page of the docs build in %s', (locale) => {
	it.each(PAGES)('%s hydrates in its locale, and keeps the text of its HTML', async (path) => {
		const tab = await openTab(locale)

		const errors: string[] = []

		tab.on('pageerror', (error) => errors.push(error.message))

		tab.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text())
		})

		await tab.addInitScript({ content: KEEP_HTML_TEXT })

		await tab.goto(`${origin}${path}`)

		await tab.waitForFunction(HYDRATED)

		await tab.waitForLoadState('networkidle')

		const { lang, before, after } = await tab.evaluate(() => ({
			lang: document.documentElement.lang,
			before: document.documentElement.dataset.text ?? '',
			after: document.body.innerText,
		}))

		expect(lang).toBe(locale)

		// Each line of the HTML stays after hydration. A page can add text, such
		// as the row count of a grid, and the fallback document has no text.
		const lines = new Set(after.split('\n'))

		expect(before.split('\n').filter((line) => !lines.has(line))).toEqual([])

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

/**
 * Opens `/button`, and gives the fallback page for each `HEAD` request of the
 * manifest file while `stale()` is true, as the host does after a deploy.
 * Gives the tab and the number of loads of the document so far.
 */
async function openReplaced(stale: () => boolean): Promise<{ tab: Page; loads: () => number }> {
	const tab = await openTab()

	const url = `${origin}/button`

	let loads = 0

	await tab.route(url, (route) => {
		loads++

		return route.continue()
	})

	await tab.route(/\/assets\/manifest-[\w-]+\.js$/, async (route) => {
		if (route.request().method() !== 'HEAD' || !stale()) return route.continue()

		const fallback = await route.fetch({ url: `${origin}/no-such-file`, method: 'GET' })

		return route.fulfill({ response: fallback, body: '' })
	})

	await tab.goto(url)

	await tab.waitForFunction(HYDRATED)

	await tab.waitForLoadState('networkidle')

	return { tab, loads: () => loads }
}

describe('a page whose build a deploy replaced', () => {
	it('reloads one time at the start, and hydrates', async () => {
		const { tab, loads } = await openReplaced(() => true)

		await tab.waitForFunction(HYDRATED)

		expect(loads()).toBe(2)
	})

	it('reloads one time when the reader comes back to the tab', async () => {
		let stale = false

		const { tab, loads } = await openReplaced(() => stale)

		expect(loads()).toBe(1)

		stale = true

		await tab.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))

		await tab.waitForEvent('load')

		await tab.waitForFunction(HYDRATED)

		expect(loads()).toBe(2)
	})
})

/**
 * Opens `/button`, and fails the first load of each module file whose path
 * matches `failed` with the fallback page, as the host does for a file that
 * it does not have. Gives the tab, the number of loads of the document, and
 * each module file that the page fetched again. A module load is a `script`
 * request, and a new fetch is a `fetch` request. The request does not show
 * its cache mode, as Chromium adds the headers of `cache: 'reload'` after the
 * route.
 */
async function openFailed(
	failed: RegExp,
): Promise<{ tab: Page; loads: () => number; refetched: string[] }> {
	const tab = await openTab()

	const url = `${origin}/button`

	let loads = 0

	const seen = new Set<string>()

	const refetched: string[] = []

	await tab.route(url, (route) => {
		loads++

		return route.continue()
	})

	await tab.route(/\/assets\/[\w.-]+\.js$/, async (route) => {
		const request = route.request()

		const { pathname } = new URL(request.url())

		if (request.resourceType() === 'fetch') refetched.push(pathname)

		if (!failed.test(pathname) || seen.has(pathname)) return route.continue()

		seen.add(pathname)

		const fallback = await route.fetch({ url: `${origin}/no-such-file` })

		return route.fulfill({ response: fallback })
	})

	await tab.goto(url)

	return { tab, loads: () => loads, refetched }
}

describe('a page whose module file fails to load one time', () => {
	it('fetches the module files again, then reloads one time and hydrates', async () => {
		const { tab, loads, refetched } = await openFailed(/\/entry\.client-/)

		await tab.waitForFunction(HYDRATED)

		expect(loads()).toBe(2)

		expect(refetched).toContainEqual(expect.stringMatching(/\/entry\.client-/))
	})

	it('fetches the module files again when a chunk fails after hydration', async () => {
		const { tab, loads, refetched } = await openFailed(/\/reduced-motion-features-animation-/)

		await tab.waitForFunction(HYDRATED)

		await tab.waitForLoadState('networkidle')

		expect(loads()).toBe(1)

		expect(refetched).toContainEqual(expect.stringMatching(/\/reduced-motion-features-animation-/))
	})
})
