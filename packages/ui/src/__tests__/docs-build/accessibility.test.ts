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
// of each page, in the light theme, at the width of a desktop, with reduced
// motion.
//
// A page loads nothing from another host, so the result does not depend on
// the network. The PDF of the PdfViewer page is on another host, so that page
// shows the message of a failed load.

/** The axe tags of the WCAG 2.0, 2.1, and 2.2 rules at level A and AA. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']

/**
 * The rules that the run skips. `target-size` reads the space between the
 * targets. A chart or a grid measures its layout after the hydration, and
 * with several pages side by side, axe can read a target before the layout
 * ends. The rule then failed on a different page in each run, and each page
 * passed alone.
 */
const SKIPPED = { 'target-size': { enabled: false } }

/**
 * The violations that a known defect of `ui` causes, by path and rule. The
 * case fails when the violation is gone, so the entry goes with the fix.
 */
const KNOWN: readonly { path: string; rule: string; reason: string }[] = [
	{
		path: '/pdf-viewer',
		rule: 'color-contrast',
		reason: 'The message of PdfViewer is zinc-500 on its zinc-100 surface, 4.39:1.',
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
 * Opens a tab at the width of a desktop that loads only from the server of
 * the build. The tab closes after the case. The cases run side by side, so
 * the hook comes from the context of the case.
 */
async function openTab({ onTestFinished }: TestContext): Promise<Page> {
	// With reduced motion, no surface is in a transition when axe reads it.
	const tab = await browser.newPage({
		viewport: { width: 1280, height: 900 },
		reducedMotion: 'reduce',
	})

	onTestFinished(() => tab.close())

	await tab.route(
		(url) => url.origin !== origin,
		(route) => route.abort(),
	)

	return tab
}

/** Runs the WCAG rules of axe on the page at `route`, after it hydrates and its loads end. */
async function audit(route: string, context: TestContext): Promise<AxeResults['violations']> {
	const tab = await openTab(context)

	await tab.goto(`${origin}${route}`)

	await tab.waitForFunction(HYDRATED)

	await tab.waitForLoadState('networkidle')

	await tab.addScriptTag({ path: AXE })

	return tab
		.evaluate(
			({ tags, skipped }) =>
				window.axe.run(document, { runOnly: { type: 'tag', values: tags }, rules: skipped }),
			{ tags: TAGS, skipped: SKIPPED },
		)
		.then((results) => results.violations)
}

declare global {
	interface Window {
		axe: typeof import('axe-core')
	}
}

// Each case opens its own tab, so the pages load side by side.
describe.concurrent('a prerendered page of the docs build, in Chromium', () => {
	it.for(PATHS)('%s breaks no WCAG A or AA rule of axe', async (route, context) => {
		const { expect } = context

		const violations = await audit(route, context)

		const known = KNOWN.filter((entry) => entry.path === route).map((entry) => entry.rule)

		const found = violations.flatMap(({ id, nodes }) =>
			known.includes(id) ? [] : nodes.map((node) => `${id}: ${node.target.join(' ')}`),
		)

		expect(found).toEqual([])

		const gone = known.filter((rule) => !violations.some((violation) => violation.id === rule))

		expect(gone, 'these known violations are gone, so remove their entries').toEqual([])
	})
})
