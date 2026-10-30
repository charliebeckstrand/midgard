import { type Browser, chromium, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, inject, it, onTestFinished } from 'vitest'
import { HYDRATED } from '../../../scripts/docs-server'

// The first paint of the docs has the current items in view. The inline script
// of the docs (`scroll-restoration.tsx`) scrolls the sidebar and the tab row to
// the current item before the first paint, so the paint of the server markup,
// with no module script, shows the same scroll as the page after hydration.

/** A page near the top of the sidebar, one in the middle, and one at the end. */
const PAGES = ['/badge', '/modules/grid', '/structure/stack']

/** Tabs in the middle and at the end of a tab row that overflows on a phone. */
const TABS = ['/modules/grid/toolbar', '/modules/grid/virtualization']

/**
 * The module scripts of the build. The script of the latin face of the font
 * (`google-sans-flex-latin`) is also in the assets, and it runs before the
 * first paint, so a page without the modules keeps it. Without the face, the
 * text paints in a fallback face of a different width.
 */
const MODULE_SCRIPT = /\/assets\/(?!google-sans-flex-).+\.js$/

const origin = inject('docsOrigin')

let browser: Browser

beforeAll(async () => {
	browser = await chromium.launch()
})

afterAll(async () => {
	await browser?.close()
})

/**
 * Opens a tab that is `width` wide. The stale-chunk guard of the docs sees a
 * recent reload, so a page with no module script does not reload. The tab
 * closes after the case.
 */
async function openTab(width: number): Promise<Page> {
	const tab = await browser.newPage({ viewport: { width, height: 720 } })

	onTestFinished(() => tab.close())

	await tab.addInitScript(() => sessionStorage.setItem('docs:stale-reload', String(Date.now())))

	return tab
}

/**
 * Reads the state of `path` in the server markup alone, and then after
 * hydration. `read` is the source of a function that runs in the page.
 */
async function readBoth<T>(path: string, width: number, read: string, signal: AbortSignal) {
	const server = await openTab(width)

	await server.route(MODULE_SCRIPT, (route) => route.abort())

	await server.goto(`${origin}${path}`)

	const painted = await server.evaluate<T>(read)

	signal.throwIfAborted()

	const hydrated = await openTab(width)

	await hydrated.goto(`${origin}${path}`)

	await hydrated.waitForFunction(HYDRATED)

	await hydrated.waitForLoadState('networkidle')

	return { painted, hydrated: await hydrated.evaluate<T>(read) }
}

/** The scroll of the sidebar body, and whether the whole current item is in view. */
type SidebarState = { scrollTop: number; inView: boolean }

/** Reads the {@link SidebarState} of the page. */
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
		// The width of a desktop, where the sidebar is in the page.
		const { painted, hydrated } = await readBoth<SidebarState>(path, 1280, READ_SIDEBAR, signal)

		expect(painted.inView).toBe(true)

		expect(hydrated).toEqual(painted)
	})
})

/** The scroll of the tab row, whether it overflows, whether the whole current tab is in view, and the scroll of the window. */
type TabRowState = { scrollLeft: number; overflows: boolean; inView: boolean; pageY: number }

/** Reads the {@link TabRowState} of the page. */
const READ_TAB_ROW = `(() => {
	const scroller = document.querySelector('[data-slot="tab-list-scroll"]')
	const tab = scroller.querySelector('[data-slot="tab"][data-current]')
	const view = scroller.getBoundingClientRect()
	const box = tab.getBoundingClientRect()
	return {
		scrollLeft: scroller.scrollLeft,
		overflows: scroller.scrollWidth > scroller.clientWidth,
		inView: box.left >= view.left && box.right <= view.right,
		pageY: window.scrollY,
	}
})()`

describe('the tab row of the docs build', () => {
	it.for(TABS)('%s paints its final scroll before hydration', async (path, { signal }) => {
		// The width of a phone, where the row overflows.
		const { painted, hydrated } = await readBoth<TabRowState>(path, 390, READ_TAB_ROW, signal)

		// The tab is in view in the row, and the page does not scroll to it.
		expect(painted).toMatchObject({ overflows: true, inView: true, pageY: 0 })

		expect(hydrated).toEqual(painted)
	})
})
