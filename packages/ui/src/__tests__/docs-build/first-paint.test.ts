import { type Browser, chromium, type Page } from 'playwright'
import { afterAll, beforeAll, describe, inject, it, type TestContext } from 'vitest'
import { STYLED } from '../../../scripts/docs-server'

// The first paint of the docs has the current item of the sidebar in view. The
// current row is the initial scroll target of the sidebar (`SidebarItem`), so
// in Chromium the paint of the server markup, with the bundled module scripts
// blocked, shows the same scroll as the page after hydration.

/** A page near the top of the sidebar, one in the middle, and one at the end. */
const PAGES = ['/badge', '/modules/grid', '/structure/stack']

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
 * closes after the case. The cases run side by side, so the hook comes from
 * the context of the case.
 */
async function openTab({ onTestFinished }: TestContext, width: number): Promise<Page> {
	const tab = await browser.newPage({ viewport: { width, height: 720 } })

	onTestFinished(() => tab.close())

	await tab.addInitScript(() => sessionStorage.setItem('docs:stale-reload', String(Date.now())))

	return tab
}

/**
 * Reads the state of `path` in the server markup alone, and then after
 * hydration. `read` is the source of a function that runs in the page.
 */
async function readBoth<T>(context: TestContext, path: string, width: number, read: string) {
	const server = await openTab(context, width)

	await server.route(MODULE_SCRIPT, (route) => route.abort())

	await server.goto(`${origin}${path}`)

	const painted = await server.evaluate<T>(read)

	context.signal.throwIfAborted()

	const hydrated = await openTab(context, width)

	await hydrated.goto(`${origin}${path}`)

	await hydrated.waitForFunction(STYLED)

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

// Each case opens its own tabs, so the pages load side by side.
describe.concurrent('the sidebar of the docs build', () => {
	it.for(PAGES)('%s paints its final scroll before hydration', async (path, context) => {
		const { expect } = context

		// The width of a desktop, where the sidebar is in the page.
		const { painted, hydrated } = await readBoth<SidebarState>(context, path, 1280, READ_SIDEBAR)

		expect(painted.inView).toBe(true)

		expect(hydrated).toEqual(painted)
	})
})
