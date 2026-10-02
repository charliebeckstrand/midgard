/**
 * Opens each page of the docs site in a known state, for the scripts that take
 * pictures of the site: `visual.ts` sends them to Percy, and `screens.ts`
 * writes them to disk.
 *
 * The page list comes from the sidebar of the built site, so a new, renamed,
 * or removed demo changes the pictures with no change to this file.
 */

import { join } from 'node:path'
import type { Browser, BrowserContextOptions, Page } from 'playwright'
import { build, preview } from 'vite'
import { DENSITY_DEFAULT, DENSITY_KEY } from '../src/providers/appearance/appearance-storage'
import { densityLevels } from '../src/providers/density/context'

/** The color themes of the site. */
export const THEMES = ['light', 'dark'] as const

/** One page of the docs site. */
export type DocsPage = { id: string; name: string }

/** The state of the site for one set of pictures. */
export type View = {
	density: string
	theme: (typeof THEMES)[number]
	/** The viewport width, in CSS pixels. */
	width: number
	/** Emulate a phone: a touch screen and the mobile viewport. */
	mobile?: boolean
}

const root = join(import.meta.dirname, '..')

const configFile = join(root, 'vite.docs.config.ts')

/**
 * Read the page ids and the `--density` levels from the arguments of a script.
 *
 * @returns The page ids, and the density levels. With no `--density`, the
 * levels are the default level only.
 */
export function readArgs(args: string[]) {
	const ids = args.filter((arg) => !arg.startsWith('--'))

	const densityArg = args.find((arg) => arg.startsWith('--density='))

	const densities = densityArg
		? densityArg.slice('--density='.length).split(',')
		: [DENSITY_DEFAULT]

	const unknown = densities.filter((level) => !densityLevels.some((known) => known.value === level))

	if (unknown.length) throw new Error(`no density level is named ${unknown.join(', ')}.`)

	return { ids, densities }
}

/**
 * Build the docs site and serve the build.
 *
 * @returns The local URL of the site, and a function that stops the server.
 */
export async function serveDocs() {
	await build({ configFile, logLevel: 'warn' })

	const server = await preview({ configFile, logLevel: 'warn', preview: { port: 4173 } })

	const url = server.resolvedUrls?.local[0]

	if (!url) throw new Error('the preview server has no local URL.')

	return { url, close: () => server.close() }
}

/** Read the id and the name of each docs page from the sidebar of the site. */
export async function readPages(browser: Browser, url: string): Promise<DocsPage[]> {
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

	await page.goto(url)

	const links = page.locator('[data-slot="sidebar"] a[data-slot="sidebar-item-inner"][href^="#"]')

	await links.first().waitFor()

	const pages = await links.evaluateAll((nodes) =>
		nodes.map((node) => ({
			id: node.getAttribute('href')?.slice(1) ?? '',
			name: node.textContent?.trim() ?? '',
		})),
	)

	await page.close()

	return pages
}

/**
 * Select the pages that the ids name. With no ids, select each page.
 *
 * @throws When an id names no page.
 */
export function selectPages(pages: DocsPage[], ids: string[]) {
	const unknown = ids.filter((id) => !pages.some((page) => page.id === id))

	if (unknown.length) throw new Error(`no docs page has the id ${unknown.join(', ')}.`)

	return ids.length ? pages.filter((page) => ids.includes(page.id)) : pages
}

/**
 * Open each page in each view, and call `capture` when the page is ready.
 *
 * @remarks
 * Each view gets one browser context, and each page gets a new tab, so a demo
 * never keeps the state that the last demo left. The page is ready when its
 * heading shows, the network is idle, and the fonts are loaded.
 */
export async function walkPages(
	browser: Browser,
	url: string,
	pages: DocsPage[],
	views: View[],
	capture: (page: Page, docsPage: DocsPage, view: View) => Promise<void>,
) {
	for (const view of views) {
		const context = await browser.newContext(contextOptions(view))

		// The pre-paint script of the site reads the stored level, as it does for a
		// reader who picked it.
		await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
			DENSITY_KEY,
			view.density,
		] as const)

		for (const docsPage of pages) {
			const page = await context.newPage()

			await page.goto(`${url}#${docsPage.id}`)

			await page.locator('h1', { hasText: docsPage.name }).first().waitFor()

			await page.waitForLoadState('networkidle')

			await page.evaluate(() => document.fonts.ready)

			await capture(page, docsPage, view)

			await page.close()
		}

		await context.close()
	}
}

// The site follows the color scheme of the system until the reader picks a
// theme, so the scheme of the context sets the theme. Reduced motion lets each
// animation end before the capture.
function contextOptions(view: View): BrowserContextOptions {
	return {
		colorScheme: view.theme,
		reducedMotion: 'reduce',
		viewport: { width: view.width, height: 900 },
		...(view.mobile && { isMobile: true, hasTouch: true }),
	}
}
