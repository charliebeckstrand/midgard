import { type Browser, chromium, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, inject, it, onTestFinished } from 'vitest'
import { HYDRATED } from '../../../scripts/docs-server'

// The first paint of the docs sidebar is its final state. The CSS of the
// current item scrolls the body to the item (`scroll-initial-target`), and
// scroll-driven animations light the letter of the rail. No script sets
// either one. So the paint of the server markup, with no module script, shows
// the same scroll and the same letter as the page after hydration.

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

/** The scroll of the sidebar body, whether the whole current item is in view, and the lit letters of the rail. */
type SidebarState = { scrollTop: number; inView: boolean; lit: string[] }

/** Reads the {@link SidebarState} of the page. It is the source of a function that runs in the page. */
const READ_SIDEBAR = `(() => {
	const panel = document.querySelector('[data-slot="sidebar-panel"]')
	const body = panel.querySelector('[data-slot="sidebar-body"]')
	const item = body.querySelector('[data-current]').closest('[data-slot="sidebar-item"]')
	const view = body.getBoundingClientRect()
	const row = item.getBoundingClientRect()
	const letters = panel.querySelectorAll('[data-slot="letter-rail-track"] > span:not([data-slot])')
	return {
		scrollTop: body.scrollTop,
		inView: row.top >= view.top && row.bottom <= view.bottom,
		lit: Array.from(letters)
			.filter((letter) => getComputedStyle(letter).getPropertyValue('--letter-on').trim() === '1')
			.map((letter) => letter.textContent),
	}
})()`

describe('the sidebar of the docs build', () => {
	it.for(PAGES)(
		'%s paints its final scroll and letter before hydration',
		async (path, { signal }) => {
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

			expect(painted.lit).toHaveLength(1)

			expect(await hydrated.evaluate<SidebarState>(READ_SIDEBAR)).toEqual(painted)
		},
	)
})
