/**
 * Sends a snapshot of each page of the docs site to Percy for visual review.
 *
 * Run it on demand with `pnpm --filter ui visual`, or with the manual `Visual`
 * workflow. It does not run on a pull request. Give page ids as arguments to
 * snapshot only those pages, for example `pnpm --filter ui visual button tabs`.
 *
 * The script needs `PERCY_TOKEN`. When the token is not set, it writes one
 * notice and stops with status 0. When the token is set, the script runs again
 * under `percy exec`, which starts the Percy server and finalizes the build.
 *
 * The page list comes from the sidebar of the built site, so a new, renamed,
 * or removed demo changes the snapshots with no change to this file. Each page
 * gets one snapshot for each theme. Percy renders each snapshot at each width
 * of `WIDTHS`, and in each browser of the Percy project.
 */

import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import percySnapshot from '@percy/playwright'
import { type Browser, chromium } from 'playwright'
import { build, preview } from 'vite'

/** The phone width and the desktop width, in CSS pixels. */
const WIDTHS = [390, 1280]

const THEMES = ['light', 'dark'] as const

const root = join(import.meta.dirname, '..')

const configFile = join(root, 'vite.docs.config.ts')

const ids = process.argv.slice(2)

if (!process.env.PERCY_TOKEN) {
	console.log('visual: PERCY_TOKEN is not set, so no snapshots were sent.')

	process.exit(0)
}

// `percy exec` sets `PERCY_SERVER_ADDRESS` for the command that it runs. When
// the address is not set, run this file again under `percy exec`.
if (!process.env.PERCY_SERVER_ADDRESS) {
	const result = spawnSync(
		'percy',
		['exec', '--', 'tsx', join(import.meta.dirname, 'visual.ts'), ...ids],
		{ cwd: root, stdio: 'inherit' },
	)

	process.exit(result.status ?? 1)
}

await build({ configFile, logLevel: 'warn' })

const server = await preview({ configFile, logLevel: 'warn', preview: { port: 4173 } })

const url = server.resolvedUrls?.local[0]

if (!url) throw new Error('visual: the preview server has no local URL.')

let browser: Browser | undefined

try {
	browser = await chromium.launch()

	const pages = await readPages(browser, url)

	const selected = ids.length ? pages.filter((page) => ids.includes(page.id)) : pages

	const unknown = ids.filter((id) => !pages.some((page) => page.id === id))

	if (unknown.length) throw new Error(`visual: no docs page has the id ${unknown.join(', ')}.`)

	for (const theme of THEMES) {
		// The site follows the color scheme of the system until the reader picks a
		// theme, so the scheme of the context sets the theme. Reduced motion lets
		// each animation end before the capture.
		const context = await browser.newContext({
			colorScheme: theme,
			reducedMotion: 'reduce',
			viewport: { width: WIDTHS[WIDTHS.length - 1] ?? 1280, height: 900 },
		})

		for (const { id, name } of selected) {
			// A new page loads each demo from the start. A hash change in one page
			// would keep the state that the last demo left.
			const page = await context.newPage()

			await page.goto(`${url}#${id}`)

			await page.locator('h1', { hasText: name }).first().waitFor()

			await page.waitForLoadState('networkidle')

			await page.evaluate(() => document.fonts.ready)

			await percySnapshot(page, `${name} (${theme})`, {
				widths: WIDTHS,
				responsiveSnapshotCapture: true,
			})

			await page.close()
		}

		await context.close()
	}

	console.log(`visual: took ${selected.length * THEMES.length} snapshots.`)
} finally {
	await browser?.close()

	await server.close()
}

/** Read the id and the name of each docs page from the sidebar of the site. */
async function readPages(browser: Browser, url: string) {
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
