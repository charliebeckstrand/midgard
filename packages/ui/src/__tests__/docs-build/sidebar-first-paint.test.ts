import { type Browser, chromium, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, inject, it, onTestFinished } from 'vitest'
import { HYDRATED } from '../../../scripts/docs-server'

// The first paint of the docs sidebar has its final scroll. The CSS of the
// current item scrolls the body to the item (`scroll-initial-target`), so the
// paint of the server markup, with no module script, shows the same scroll as
// the page after hydration.

/** A page near the top of the sidebar, one in the middle, and one at the end. */
const PAGES = ['/badge', '/modules/grid', '/structure/stack']

const origin = inject('docsOrigin')

let browser: Browser

beforeAll(async () => {
	browser = await chromium.launch()
})

afterAll(async () => {
	await browser?.close()
})

/**
 * Opens a tab at the width of a desktop, where the sidebar is in the page. The
 * stale-chunk guard of the docs sees a recent reload, so a page with no module
 * script does not reload. The tab closes after the case.
 */
async function openTab(): Promise<Page> {
	const tab = await browser.newPage({ viewport: { width: 1280, height: 720 } })

	onTestFinished(() => tab.close())

	await tab.addInitScript(() => sessionStorage.setItem('docs:stale-reload', String(Date.now())))

	return tab
}

/** The scroll of the sidebar body, and whether the whole current item is in view. */
type SidebarState = { scrollTop: number; inView: boolean }

/** Reads the {@link SidebarState} of the page. It is the source of a function that runs in the page. */
const READ_SIDEBAR = `(() => {
	const panel = document.querySelector('[data-slot="sidebar-panel"]')
	const body = panel.querySelector('[data-slot="sidebar-body"]')
	const item = body.querySelector('[data-current]').closest('[data-slot="sidebar-item"]')
	const view = body.getBoundingClientRect()
	const row = item.getBoundingClientRect()
	return {
		scrollTop: body.scrollTop,
		inView: row.top >= view.top && row.bottom <= view.bottom,
	}
})()`

describe('the sidebar of the docs build', () => {
	it.for(PAGES)('%s paints its final scroll before hydration', async (path, { signal }) => {
		const server = await openTab()

		await server.route(/\/assets\/.+\.js$/, (route) => route.abort())

		await server.goto(`${origin}${path}`)

		const painted = await server.evaluate<SidebarState>(READ_SIDEBAR)

		signal.throwIfAborted()

		const hydrated = await openTab()

		await hydrated.goto(`${origin}${path}`)

		await hydrated.waitForFunction(HYDRATED)

		await hydrated.waitForLoadState('networkidle')

		expect(painted.inView).toBe(true)

		expect(await hydrated.evaluate<SidebarState>(READ_SIDEBAR)).toEqual(painted)
	})
})
