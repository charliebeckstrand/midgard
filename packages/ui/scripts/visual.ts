/**
 * Sends a snapshot of each fixture sheet to Percy for visual review.
 *
 * Run it on demand with `pnpm --filter ui visual`, or with the `Visual`
 * workflow. It does not run on a pull request. Give sheet ids as arguments to
 * snapshot only those sheets, for example `pnpm --filter ui visual buttons`.
 *
 * A sheet shows one family of components in fixed states: the defaults, and
 * the states that need no interaction. The sheets are in src/docs/fixtures,
 * apart from the docs pages, so an edit to a docs page does not change a
 * snapshot. The id of a sheet is its file name in `sheets/`.
 *
 * The script needs `PERCY_TOKEN`. When the token is not set, it writes one
 * notice and stops with status 0. When the token is set, the script runs again
 * under `percy exec`, which starts the Percy server and finalizes the build.
 *
 * The sheet list comes from the index page of the built sheets, so a new,
 * renamed, or removed sheet changes the snapshots with no change to this file.
 * Each sheet gets one snapshot for each theme. Percy renders each snapshot at
 * each width of `WIDTHS`, and in each browser of the Percy project.
 *
 * A run takes the default density, `snug`. Give `--density` with a list of
 * levels to snapshot other levels too, for example `--density=loose,compact`.
 * Each level adds one snapshot for each sheet and theme. The name of a snapshot
 * at a level other than the default names the level. An unknown option stops
 * the script before it sends a snapshot.
 */

import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import percySnapshot from '@percy/playwright'
import { type Browser, chromium } from 'playwright'
import { build, preview } from 'vite'
import { DENSITY } from '../src/providers/appearance/appearance-storage'
import { densityLevels } from '../src/providers/density/context'

/** The phone width and the desktop width, in CSS pixels. */
const WIDTHS = [390, 1280]

const THEMES = ['light', 'dark'] as const

/** The time that each sheet gets to settle before its snapshot, in milliseconds. */
const SETTLE_MS = 1000

const root = join(import.meta.dirname, '..')

const configFile = join(root, 'vite.fixtures.config.ts')

const args = process.argv.slice(2)

const { values, positionals: ids } = parseArgs({
	args,
	allowPositionals: true,
	options: { density: { type: 'string' } },
})

const densities = values.density ? values.density.split(',') : [DENSITY.fallback]

const unknownDensities = densities.filter(
	(level) => !densityLevels.some((known) => known.value === level),
)

if (unknownDensities.length) {
	throw new Error(`visual: no density level is named ${unknownDensities.join(', ')}.`)
}

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

	const sheets = await readSheets(browser, url)

	const selected = ids.length ? sheets.filter((id) => ids.includes(id)) : sheets

	const unknown = ids.filter((id) => !sheets.includes(id))

	if (unknown.length) throw new Error(`visual: no fixture sheet has the id ${unknown.join(', ')}.`)

	for (const { density, theme } of densities.flatMap((density) =>
		THEMES.map((theme) => ({ density, theme })),
	)) {
		// The sheets follow the color scheme of the system, so the scheme of the
		// context sets the theme. Reduced motion lets each animation end before the
		// capture.
		const context = await browser.newContext({
			colorScheme: theme,
			reducedMotion: 'reduce',
			viewport: { width: WIDTHS[WIDTHS.length - 1] ?? 1280, height: 900 },
		})

		// `AppearanceProvider` of the sheets reads the stored level, as the docs
		// site does for a reader who picked it.
		await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
			DENSITY.key,
			density,
		] as const)

		const suffix = density === DENSITY.fallback ? theme : `${theme}, ${density}`

		for (const id of selected) {
			// A new page loads each sheet from the start.
			const page = await context.newPage()

			await page.goto(`${url}#${id}`)

			await page.locator('[data-slot="fixture-sheet"]').waitFor()

			await page.waitForLoadState('networkidle')

			await page.evaluate(() => document.fonts.ready)

			// Reduced motion stops the transform animations of `motion`, but a spring
			// on another value still runs on mount, for example the arc of
			// ProgressGauge. One second lets each spring settle, so that two runs on
			// the same commit give the same snapshot.
			await page.waitForTimeout(SETTLE_MS)

			await percySnapshot(page, `Fixture ${id} (${suffix})`, {
				widths: WIDTHS,
				responsiveSnapshotCapture: true,
			})

			await page.close()
		}

		await context.close()
	}

	console.log(`visual: took ${selected.length * THEMES.length * densities.length} snapshots.`)
} finally {
	await browser?.close()

	await server.close()
}

/** Read the id of each fixture sheet from the index page of the sheets. */
async function readSheets(browser: Browser, url: string) {
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

	await page.goto(url)

	const links = page.locator('[data-slot="fixture-index"] a[href^="#"]')

	await links.first().waitFor()

	const sheets = await links.evaluateAll((nodes) =>
		nodes.map((node) => node.getAttribute('href')?.slice(1) ?? ''),
	)

	await page.close()

	return sheets
}
