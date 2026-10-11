import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { AxeResults } from 'axe-core'
import { type Browser, chromium, type Page } from 'playwright'
import { afterAll, beforeAll, describe, inject, it, type TestContext } from 'vitest'
import { CLIENT_DIR, HYDRATED } from '../../../scripts/docs-server'

// The page smoke test runs a few structural rules of axe in jsdom, which has
// no layout and no styles. This file runs each WCAG 2.2 A and AA rule of axe
// on each prerendered page of the build in Chromium, so it also reads the
// contrast of the text and the size of the targets. It reads the first state
// of each page, in the light theme and in the dark theme, at the width of a
// desktop, with reduced motion. Each page loads one time in the light theme,
// then the color scheme of the tab changes to dark. The theme follows the
// color scheme live, so the second read costs no second load.
//
// A page loads nothing from another host, so the result does not depend on
// the network. The PDF of the PdfViewer page is on another host, so that page
// shows the message of a failed load.

/** The axe tags of the WCAG 2.0, 2.1, and 2.2 rules at level A and AA. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']

/** The themes that each page is read in. The theme of the docs follows the color scheme of the system. */
const THEMES = ['light', 'dark'] as const

type Theme = (typeof THEMES)[number]

/**
 * The time in ms in which no target of the page moves, before axe reads the
 * page. A chart or a grid measures its layout after the hydration, and part of
 * that work waits on a timer. With several pages side by side,
 * `target-size`, which reads the space between the targets, read some targets
 * before their layout ended. The rule then failed on a different page in each
 * run, and each page passed alone. A time, not a count of frames, because a
 * loaded machine gives fewer frames.
 */
const QUIET = 500

/** The longest wait for the layout to settle, in ms. A page that is still moving then gets read as it is. */
const SETTLE_LIMIT = 10_000

/**
 * The violations that a known defect of `ui` causes, by path and rule. The
 * case fails when the violation is gone, so the entry goes with the fix.
 */
const KNOWN: readonly { path: string; rule: string; reason: string; theme?: Theme }[] = [
	// WCAG 1.4.3 exempts the text of an inactive component. axe skips the text
	// of a disabled control, but these spans sit beside the disabled input, not
	// in it, so axe reads them. Dimmed on the dark surface they measure 2.46:1.
	{
		path: '/tag-input',
		rule: 'color-contrast',
		reason: 'The tags of the disabled TagInput example, which WCAG exempts as inactive.',
		theme: 'dark',
	},
	{
		path: '/credit-card-input',
		rule: 'color-contrast',
		reason:
			'The card brand of the disabled CreditCardInput example, which WCAG exempts as inactive.',
		theme: 'dark',
	},
]

/** The script of axe, which each page loads. */
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js')

/** The path of each prerendered page: the home page, and each page and tab of the docs. */
const PATHS = fs
	.globSync('**/index.html', { cwd: CLIENT_DIR })
	.map((file) => `/${path.dirname(file)}`.replace(/^\/\.$/, '/'))
	.toSorted()

const origin = inject('docsOrigin')

let browser: Browser

beforeAll(async () => {
	browser = await chromium.launch()
})

afterAll(async () => {
	await browser?.close()
})

/**
 * Opens a tab at the width of a desktop, in the light theme, that loads only
 * from the server of the build. The tab closes after the case. The cases run
 * side by side, so the hook comes from the context of the case.
 */
async function openTab({ onTestFinished }: TestContext): Promise<Page> {
	// With reduced motion, no surface is in a transition when axe reads it.
	const tab = await browser.newPage({
		viewport: { width: 1280, height: 900 },
		reducedMotion: 'reduce',
		colorScheme: 'light',
	})

	onTestFinished(() => tab.close())

	await tab.route(
		(url) => url.origin !== origin,
		(route) => route.abort(),
	)

	return tab
}

/**
 * Waits in the page until no target moves for `quiet` ms, or until `limit` ms
 * pass. A target is an element that a reader can press or focus.
 */
function settle({ quiet, limit }: { quiet: number; limit: number }): Promise<void> {
	const targets = 'a[href], button, input, select, textarea, [role], [tabindex]'

	const layout = () =>
		[...document.querySelectorAll(targets)]
			.map((element) => {
				const { x, y, width, height } = element.getBoundingClientRect()

				return `${Math.round(x)},${Math.round(y)},${Math.round(width)},${Math.round(height)}`
			})
			.join(';')

	return new Promise((resolve) => {
		const end = performance.now() + limit

		let last = layout()

		let since = performance.now()

		const frame = () => {
			const now = performance.now()

			const next = layout()

			if (next !== last) {
				last = next

				since = now
			}

			if (now - since >= quiet || now > end) resolve()
			else requestAnimationFrame(frame)
		}

		requestAnimationFrame(frame)
	})
}

/** Runs the WCAG rules of axe on the page in the tab, after its layout settles. */
async function audit(tab: Page): Promise<AxeResults['violations']> {
	await tab.evaluate(settle, { quiet: QUIET, limit: SETTLE_LIMIT })

	return tab
		.evaluate((tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), TAGS)
		.then((results) => results.violations)
}

/**
 * Runs the WCAG rules of axe on the page at `route` in each theme, after it
 * hydrates and its loads end. After the change to the dark theme, axe waits
 * until the root has the `dark` class and no color is in a transition.
 */
async function auditThemes(
	route: string,
	context: TestContext,
): Promise<Record<Theme, AxeResults['violations']>> {
	const tab = await openTab(context)

	await tab.goto(`${origin}${route}`)

	await tab.waitForFunction(HYDRATED)

	await tab.waitForLoadState('networkidle')

	await tab.addScriptTag({ path: AXE })

	const light = await audit(tab)

	await tab.emulateMedia({ colorScheme: 'dark' })

	await tab.waitForFunction(
		() =>
			document.documentElement.classList.contains('dark') &&
			document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
	)

	const dark = await audit(tab)

	return { light, dark }
}

declare global {
	interface Window {
		axe: typeof import('axe-core')
	}
}

// Each case opens its own tab, so the pages load side by side.
describe.concurrent('a prerendered page of the docs build, in Chromium', () => {
	it.for(PATHS)('%s breaks no WCAG A or AA rule of axe in either theme', async (route, context) => {
		const { expect } = context

		const results = await auditThemes(route, context)

		for (const theme of THEMES) {
			const violations = results[theme]

			const known = KNOWN.filter(
				(entry) => entry.path === route && (entry.theme === undefined || entry.theme === theme),
			).map((entry) => entry.rule)

			const found = violations.flatMap(({ id, nodes }) =>
				known.includes(id) ? [] : nodes.map((node) => `${id}: ${node.target.join(' ')}`),
			)

			expect(found, `in the ${theme} theme`).toEqual([])

			const gone = known.filter((rule) => !violations.some((violation) => violation.id === rule))

			expect(
				gone,
				`in the ${theme} theme, these known violations are gone, so remove their entries`,
			).toEqual([])
		}
	})
})
