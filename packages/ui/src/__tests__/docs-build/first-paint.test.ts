import { type Browser, chromium, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, inject, it, onTestFinished } from 'vitest'
import { HYDRATED } from '../../../scripts/docs-server'

// The first paint of the docs has the current items in view. The CSS of the
// current sidebar item and of the current tab scrolls each scroller to its item
// (`scroll-initial-target`), so the paint of the server markup, with no module
// script, shows the scroll of the page after hydration.

/** A page near the top of the sidebar, one in the middle, and one at the end. */
const PAGES = ['/badge', '/modules/grid', '/structure/stack']

/** Tabs in the middle and at the end of a tab row that overflows on a phone. */
const TABS = ['/modules/grid/toolbar', '/modules/grid/virtualization']

const origin = inject('docsOrigin')

let browser: Browser

beforeAll(async () => {
	browser = await chromium.launch()
})

afterAll(async () => {
	await browser?.close()
})

/**
 * Opens a tab that is `width` wide. The default is the width of a desktop,
 * where the sidebar is in the page. The stale-chunk guard of the docs sees a
 * recent reload, so a page with no module script does not reload. The tab
 * closes after the case.
 */
async function openTab(width = 1280): Promise<Page> {
	const tab = await browser.newPage({ viewport: { width, height: 720 } })

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

/** Reads whether the whole current tab is in view, and the scroll of the window. */
const READ_TAB = `(() => {
	const scroller = document.querySelector('[data-slot="tab-list-scroll"]')
	const tab = scroller.querySelector('[data-slot="tab"][data-current]')
	const view = scroller.getBoundingClientRect()
	const box = tab.getBoundingClientRect()
	return {
		overflows: scroller.scrollWidth > scroller.clientWidth,
		inView: box.left >= view.left && box.right <= view.right,
		pageY: window.scrollY,
	}
})()`

describe('the tab row of the docs build', () => {
	it.for(TABS)('%s paints with the current tab in view before hydration', async (path) => {
		const tab = await openTab(390)

		await tab.route(/\/assets\/.+\.js$/, (route) => route.abort())

		await tab.goto(`${origin}${path}`)

		// The tab is in view in the row, and the page does not scroll to it.
		expect(await tab.evaluate(READ_TAB)).toEqual({ overflows: true, inView: true, pageY: 0 })
	})
})
