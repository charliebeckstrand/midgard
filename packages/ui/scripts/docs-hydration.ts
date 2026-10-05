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
 */

import { chromium } from 'playwright'
import { HYDRATED, serveDocs } from './docs-server'

const PAGES = [
	'/',
	'/button',
	'/accordion',
	'/modules/grid',
	'/modules/grid/sorting',
	'/no-such-page',
]

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
} finally {
	await browser.close()

	server.close()
}

if (failures.length > 0) {
	console.error(`Hydration errors:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`)

	process.exit(1)
}

console.log(`${PAGES.length} pages of the docs hydrated with no errors.`)
