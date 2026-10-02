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
 * `docs-pages.ts` opens each page. Each page gets one snapshot for each theme. Percy renders each snapshot at each width
 * of `WIDTHS`, and in each browser of the Percy project.
 *
 * A run takes the default density, `snug`. Give `--density` with a list of
 * levels to snapshot other levels too, for example `--density=loose,compact`.
 * Each level adds one snapshot for each page and theme. The name of a snapshot
 * at a level other than the default names the level.
 */

import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import percySnapshot from '@percy/playwright'
import { type Browser, chromium } from 'playwright'
import { DENSITY_DEFAULT } from '../src/providers/appearance/appearance-storage'
import { readArgs, readPages, selectPages, serveDocs, THEMES, walkPages } from './docs-pages'

/** The phone width and the desktop width, in CSS pixels. */
const WIDTHS = [390, 1280]

const args = process.argv.slice(2)

const { ids, densities } = readArgs(args)

if (!process.env.PERCY_TOKEN) {
	console.log('visual: PERCY_TOKEN is not set, so no snapshots were sent.')

	process.exit(0)
}

// `percy exec` sets `PERCY_SERVER_ADDRESS` for the command that it runs. When
// the address is not set, run this file again under `percy exec`.
if (!process.env.PERCY_SERVER_ADDRESS) {
	const result = spawnSync(
		'percy',
		['exec', '--', 'tsx', join(import.meta.dirname, 'visual.ts'), ...args],
		{ cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
	)

	process.exit(result.status ?? 1)
}

const server = await serveDocs()

let browser: Browser | undefined

try {
	browser = await chromium.launch()

	const pages = selectPages(await readPages(browser, server.url), ids)

	// Percy renders each snapshot at each width of `WIDTHS`, so each view opens
	// the page at the desktop width only.
	const views = densities.flatMap((density) =>
		THEMES.map((theme) => ({ density, theme, width: WIDTHS[WIDTHS.length - 1] ?? 1280 })),
	)

	await walkPages(browser, server.url, pages, views, async (page, { name }, { density, theme }) => {
		const suffix = density === DENSITY_DEFAULT ? theme : `${theme}, ${density}`

		await percySnapshot(page, `${name} (${suffix})`, {
			widths: WIDTHS,
			responsiveSnapshotCapture: true,
		})
	})

	console.log(`visual: took ${pages.length * views.length} snapshots.`)
} finally {
	await browser?.close()

	await server.close()
}
