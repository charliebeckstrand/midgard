/**
 * Writes a screenshot of each page of the docs site to disk, for the weekly
 * `Screens` workflow, which compares them with the screenshots of the last
 * run. `screens-diff.ts` makes the comparison. No quota limits these runs, as
 * it does for Percy.
 *
 * Run it with `pnpm --filter ui screens`. Give page ids as arguments to take
 * only those pages, and `--density` with a list of levels to take other levels
 * than the default. Give `--out=<dir>` to set the folder; the default is
 * `.screens/current`.
 *
 * Each page gets one full-page screenshot for each density, theme, and width.
 * The phone width also emulates a touch screen. The file name is
 * `<page id>--<theme>--<density>--<width>.png`.
 */

import { mkdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { type Browser, chromium, type Page } from 'playwright'
import {
	readArgs,
	readPages,
	selectPages,
	serveDocs,
	THEMES,
	type View,
	walkPages,
} from './docs-pages'

/** The phone width and the desktop width, in CSS pixels. */
const WIDTHS = [390, 1280]

/** The height of the viewport before the fit, as `docs-pages.ts` sets it. */
const VIEWPORT_HEIGHT = 900

/** The tallest viewport for one screenshot, in CSS pixels. */
const MAX_HEIGHT = 16_000

/** Below this width, a view emulates a phone. */
const PHONE_MAX = 640

const args = process.argv.slice(2)

const { ids, densities } = readArgs(args)

const outArg = args.find((arg) => arg.startsWith('--out='))

const out = resolve(
	outArg ? outArg.slice('--out='.length) : join(import.meta.dirname, '../.screens/current'),
)

await rm(out, { recursive: true, force: true })

await mkdir(out, { recursive: true })

const server = await serveDocs()

let browser: Browser | undefined

try {
	browser = await chromium.launch()

	const pages = selectPages(await readPages(browser, server.url), ids)

	const views: View[] = densities.flatMap((density) =>
		THEMES.flatMap((theme) =>
			WIDTHS.map((width) => ({ density, theme, width, mobile: width < PHONE_MAX })),
		),
	)

	await walkPages(
		browser,
		server.url,
		pages,
		views,
		async (page, { id }, { density, theme, width }) => {
			await fitContent(page, width)

			await page.screenshot({
				path: join(out, `${id}--${theme}--${density}--${width}.png`),
				fullPage: true,
				animations: 'disabled',
				caret: 'hide',
			})
		},
	)

	console.log(`screens: took ${pages.length * views.length} screenshots in ${out}.`)
} finally {
	await browser?.close()

	await server.close()
}

/**
 * Make the viewport as tall as the content of the page, so that a full-page
 * screenshot shows all of it.
 *
 * @remarks
 * At the desktop width, the page does not scroll. The main column of the docs
 * layout scrolls in its own box, so a full-page screenshot shows only the top
 * of the column. The scrolled box is the nearest ancestor of the heading that
 * scrolls.
 */
async function fitContent(page: Page, width: number) {
	// The extra height that the scrolled box needs, or 0 when nothing scrolls.
	const extra = await page.evaluate(() => {
		let box = document.querySelector('h1')?.parentElement ?? null

		while (
			box &&
			!(box.scrollHeight > box.clientHeight && /auto|scroll/.test(getComputedStyle(box).overflowY))
		) {
			box = box.parentElement
		}

		return box ? box.scrollHeight - box.clientHeight : 0
	})

	if (!extra) return

	await page.setViewportSize({ width, height: Math.min(VIEWPORT_HEIGHT + extra, MAX_HEIGHT) })

	await page.evaluate(
		() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
	)
}
