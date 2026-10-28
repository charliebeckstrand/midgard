import { type Browser, chromium, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, inject, it, onTestFinished } from 'vitest'
import { HYDRATED } from '../../../scripts/docs-server'

// The first paint of the docs sidebar has its final scroll: the current page
// is at the top of the body, or its section is when the page is the first of
// the section. The CSS initial scroll target puts it there. In a browser
// without `scroll-initial-target`, `CurrentScrollScript` does. So the paint of
// the server markup, with no module script, shows the same scroll on each
// path as the page after hydration. The letter rail then lights the letter of
// the page at the top, which is the letter of the current page.

/**
 * A page near the top of the sidebar, the first page of a section, a page in
 * the last view of the sidebar, and the last page. Each has its letter.
 */
const PAGES = [
	{ path: '/badge', letter: 'B' },
	{ path: '/modules/chart', letter: 'C' },
	{ path: '/providers/density', letter: 'D' },
	{ path: '/structure/stack', letter: 'S' },
]

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

/** Opens `url` with no module script. With `script`, the CSS initial target is off, so only the script scrolls. */
async function paintServerMarkup(url: string, script: boolean): Promise<Page> {
	const tab = await openTab()

	await tab.route(/\/assets\/.+\.js$/, (route) => route.abort())

	if (script) {
		await tab.route(url, async (route) => {
			const response = await route.fetch()

			const style = '<style>* { scroll-initial-target: none !important; }</style>'

			await route.fulfill({
				response,
				body: (await response.text()).replace('</head>', `${style}</head>`),
			})
		})
	}

	await tab.goto(url)

	return tab
}

/**
 * The scroll of the sidebar body, the distance from the top of the body to the
 * top of the current page (or of its section, when the page is the first of
 * the section), and the lit letters of the rail.
 */
type SidebarState = { scrollTop: number; offset: number; lit: string[] }

/** Reads the {@link SidebarState} of the page. It is the source of a function that runs in the page. */
const READ_SIDEBAR = `(() => {
	const panel = document.querySelector('[data-slot="sidebar-panel"]')
	const body = panel.querySelector('[data-slot="sidebar-body"]')
	const item = body.querySelector('[data-current]').closest('[data-slot="sidebar-item"]')
	const target = item.previousElementSibling ? item : item.closest('[data-slot="sidebar-section"]')
	const letters = panel.querySelectorAll('[data-slot="letter-rail-track"] > span:not([data-slot])')
	return {
		scrollTop: body.scrollTop,
		offset: Math.round(target.getBoundingClientRect().top - body.getBoundingClientRect().top),
		lit: Array.from(letters)
			.filter((letter) => letter.hasAttribute('data-active'))
			.map((letter) => letter.textContent),
	}
})()`

describe('the sidebar of the docs build', () => {
	it.for(PAGES)(
		'$path paints at the top of the sidebar before hydration, and lights $letter',
		async ({ path, letter }, { signal }) => {
			const url = `${origin}${path}`

			const css = await (await paintServerMarkup(url, false)).evaluate<SidebarState>(READ_SIDEBAR)

			signal.throwIfAborted()

			const script = await (await paintServerMarkup(url, true)).evaluate<SidebarState>(READ_SIDEBAR)

			signal.throwIfAborted()

			const hydrated = await openTab()

			await hydrated.goto(url)

			await hydrated.waitForFunction(HYDRATED)

			await hydrated.waitForLoadState('networkidle')

			expect(css).toEqual({ scrollTop: css.scrollTop, offset: 0, lit: [] })

			expect(script).toEqual(css)

			expect(await hydrated.evaluate<SidebarState>(READ_SIDEBAR)).toEqual({ ...css, lit: [letter] })
		},
	)
})
