/**
 * Loads some prerendered pages of the docs build in Chromium, and fails when a
 * page reports an error while it hydrates.
 *
 * Run it with `pnpm --filter ui docs:hydration`. Turbo runs the build first.
 *
 * The build renders each page to HTML on the server, and the browser hydrates
 * it. When the client renders different markup, such as from a store that
 * reads browser state with no server snapshot, React reports a recoverable
 * error and renders the page again on the client. No test without a build sees
 * this. The pages below are the home page, component pages, a module page, a
 * page with a tab in its path, and a path with no page.
 *
 * It also loads a page whose HTML names a chunk that is not in the build, as a
 * tab that the browser restores from the cache after a deploy does. The page
 * must reload one time, and no more.
 */

import { type Browser, chromium } from 'playwright'
import { HYDRATED, serveDocs } from './docs-server'

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

/**
 * Loads `/button` with HTML that names a missing `chunk` for the first
 * `staleLoads` loads of the document, waits up to `wait` ms for hydration, and
 * gives whether the page hydrated and how many times the document loaded.
 */
async function loadStale(
	browser: Browser,
	origin: string,
	chunk: string,
	staleLoads: number,
	wait: number,
): Promise<{ hydrated: boolean; loads: number }> {
	const tab = await browser.newPage({ viewport: { width: 390, height: 844 } })

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

	await tab.close()

	return { hydrated, loads }
}

const { origin, server } = await serveDocs(0)

const browser = await chromium.launch()

const failures: string[] = []

try {
	for (const page of PAGES) {
		const tab = await browser.newPage({ viewport: { width: 390, height: 844 } })

		const errors: string[] = []

		tab.on('pageerror', (error) => errors.push(error.message))

		tab.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text())
		})

		await tab.goto(`${origin}${page}`)

		await tab.waitForFunction(HYDRATED)

		// A recoverable error comes after the first commit, so wait for the page to settle.
		await tab.waitForLoadState('networkidle')

		for (const error of errors) failures.push(`${page}: ${error}`)

		await tab.close()
	}

	for (const chunk of STALE_CHUNKS) {
		const stale = await loadStale(browser, origin, chunk, 1, 10_000)

		if (!stale.hydrated || stale.loads !== 2) {
			failures.push(
				`stale ${chunk} chunk: hydrated ${stale.hydrated} after ${stale.loads} loads, not after 2`,
			)
		}

		// A build that stays broken gets one reload, not a loop.
		const broken = await loadStale(browser, origin, chunk, Number.POSITIVE_INFINITY, 3000)

		if (broken.loads !== 2) {
			failures.push(`missing ${chunk} chunk on each load: ${broken.loads} loads, not 2`)
		}
	}
} finally {
	await browser.close()

	server.close()
}

if (failures.length > 0) {
	console.error(`Hydration errors:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`)

	process.exit(1)
}

console.log(
	`${PAGES.length} pages of the docs hydrated with no errors, and a stale page reloaded one time.`,
)
