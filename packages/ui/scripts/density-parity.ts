/**
 * Compares the computed style of two builds of the docs app. A change to the
 * density system that must keep the look of each page runs this script against
 * the build of its base.
 *
 * The script opens each prerendered page of a build in Chromium, in three
 * configs ({@link CONFIGS}). It reads the computed style of each element under
 * `body`, and of its `::before` and `::after`. It skips custom properties,
 * transitions, and animations. A pseudo-element with no `content` generates no
 * box, so the script records it as empty.
 *
 * ```sh
 * pnpm --filter ui docs:parity compare <base client dir> <candidate client dir>
 * pnpm --filter ui docs:parity dump <client dir> <out.json> [--full]
 * pnpm --filter ui docs:parity diff <base.json> <candidate.json>
 * ```
 *
 * `compare` dumps the two builds, one after the other. It then opens each page
 * with a difference in style again, once, with the full style of each element:
 * first in the base build and then in the candidate build, one config at a time.
 * Thus a difference that comes from a loaded machine goes away. The second pass
 * drops an element when only the properties of a running animation differ
 * ({@link ANIMATED}). A page that is in one build only, or that did not load in
 * the first pass, gets no second pass and counts as a difference. The script
 * exits with 0 only when no difference stays.
 *
 * Options:
 *
 * - `--detail` prints each differing element with the values of each differing
 *   property, and the elements that the second pass explains.
 * - `--full` writes the full style of each element into a dump. `diff` filters
 *   the animations only when the two dumps have the full style.
 * - `--pages /button,/input` and `--config dark-compact-390` limit the run. The
 *   script opens a listed page even when {@link EXCLUDED_PAGES} holds it, but
 *   only in a build that has the prerendered page.
 *
 * The docs app must be built first: `pnpm turbo run docs:build --filter=ui`
 * writes `src/docs/dist/client`. Copy that directory before the build of the
 * other side.
 */

import { existsSync, globSync } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { type Browser, chromium, type Page } from 'playwright'
import { rootDensityClasses } from '../src/core/density/steps'
import { DENSITY, THEME } from '../src/providers/appearance/appearance-storage'
import { type DensityLevel, levelToStep } from '../src/providers/density/context'
import { HYDRATED, resolveFile, TYPES } from './docs-server'

/** One run of the docs app: a theme, a stored density level, and a viewport width. */
type Config = {
	name: string
	theme: 'light' | 'dark'
	density: DensityLevel
	width: number
}

/**
 * The configs of each run. Each stores a real density level, so the root gets
 * the step of that level: `snug` gives `md`, `compact` gives `sm`, and `loose`
 * gives `lg`. The script stops when the root does not show the step and the
 * theme of its config.
 */
const CONFIGS: readonly Config[] = [
	{ name: 'light-snug-390', theme: 'light', density: 'snug', width: 390 },
	{ name: 'dark-compact-390', theme: 'dark', density: 'compact', width: 390 },
	{ name: 'light-loose-1280', theme: 'light', density: 'loose', width: 1280 },
]

/** The height of the viewport in each config. */
const HEIGHT = 900

/**
 * The pages that the script does not open, the configs in which it does not open
 * them, and the reason for each. Exclude a page only in the configs where a
 * measurement shows the noise. The reason must name the evidence, so that a
 * reviewer can check it again.
 *
 * The list is empty. An earlier run excluded `/modules/grid/virtualization` in
 * each config. On 2026-10-14, `compare` of main against main ran three times in
 * each config with `--pages /modules/grid/virtualization`, and each run exited
 * with 0. Three dumps of the page in each config gave one hash for each config.
 */
const EXCLUDED_PAGES: readonly { page: string; configs: readonly string[]; reason: string }[] = []

/**
 * The regions of each page that the script does not read, and the reason for
 * each. The script skips the element that matches the selector and each
 * element in it.
 */
const EXCLUDED_REGIONS: readonly { selector: string; reason: string }[] = [
	{
		selector: '[data-slot="toast-viewport"]',
		reason:
			'The toast region (a `div` and its `ol`) mounts in an effect after the hydration. Thus it is present in some runs of a page and absent in others. The parity run opens no toast, so the region is empty.',
	},
]

/**
 * The properties of a running animation: WAAPI animations of charts, sparklines,
 * and map points. A second run of one build gives other values for them. An
 * element is noise when only these properties differ and an animation runs on
 * the element, or on its `::before` or `::after`, in one of the two dumps.
 */
const ANIMATED =
	/^(::before |::after )?(opacity|transform|translate|scale|rotate|stroke-dashoffset|d)$/

/** The time to wait after the page loads, before the script reads the styles, in ms. */
const SETTLE = 300

/** The time limit for each wait of a page, in ms. */
const PAGE_TIMEOUT = 30_000

/**
 * A browser expression that is `true` when the full stylesheet of the page
 * loaded. The app links the sheet after the hydration commits. The
 * `accessibility.test.ts` of `test:docs-build` waits for the same signal.
 */
const STYLED = `document.querySelector('link[rel="stylesheet"][data-precedence]')?.sheet != null`

/** A browser expression that is `true` when no CSS transition runs. */
const STILL = `document.getAnimations().every((animation) => !(animation instanceof CSSTransition))`

/** The style of one element: the element, its `::before`, and its `::after`. */
type State = [element: string, before: string, after: string]

/** The dump of one page in one config. */
type PageDump = {
	/** The tag and the `data-slot` of each element, in document order. */
	labels: string[]
	/** A hash of the label and the style of each element. */
	hashes: string[]
	/** The full style of each element, when the dump is full. */
	full?: State[]
	/** The index of each element with a running animation, when the dump is full. */
	moving?: number[]
	/** The error of a page that did not load. */
	error?: string
}

/** The dump of a build: each config, and each page in it. */
type Dump = Record<string, Record<string, PageDump>>

type DumpOptions = { configs: readonly Config[]; pages?: readonly string[]; full: boolean }

/**
 * Reads the style of each element of the page. The text is a browser
 * expression, because the TypeScript runner wraps each named function in a
 * helper that the page does not have.
 *
 * A React `useId` value in a `url(#…)` changes from run to run, so the
 * expression replaces it with `_r_`. The hash is cyrb53, a fast 53-bit hash.
 */
function readExpression(full: boolean): string {
	const skip = JSON.stringify(EXCLUDED_REGIONS.map((region) => region.selector).join(','))

	return `(() => {
	const hash = (text) => {
		let h1 = 0xdeadbeef, h2 = 0x41c6ce57
		for (let i = 0; i < text.length; i++) {
			const c = text.charCodeAt(i)
			h1 = Math.imul(h1 ^ c, 2654435761)
			h2 = Math.imul(h2 ^ c, 1597334677)
		}
		h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
		h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
		return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
	}
	const stableIds = (text) => text.replace(/url\\("#[^"]*"\\)/g, (url) => url.replace(/_r_[0-9a-z]+_/g, '_r_'))
	const read = (element, pseudo) => {
		const style = getComputedStyle(element, pseudo)
		if (pseudo && (style.content === 'none' || style.content === 'normal')) return ''
		let text = ''
		for (let i = 0; i < style.length; i++) {
			const name = style[i]
			if (name.startsWith('--') || name.startsWith('transition') || name.startsWith('animation')) continue
			text += name + ':' + style.getPropertyValue(name) + ';'
		}
		return stableIds(text)
	}
	const labels = [], hashes = [], full = [], moving = []
	for (const element of document.querySelectorAll('body *')) {
		if (element.closest(${skip})) continue
		const slot = element.getAttribute('data-slot')
		const label = element.localName + (slot ? '[data-slot="' + slot + '"]' : '')
		const state = [read(element, null), read(element, '::before'), read(element, '::after')]
		labels.push(label)
		hashes.push(hash(label + '\\n' + state.join('\\n')))
		if (!${full}) continue
		full.push(state)
		if (element.getAnimations({ subtree: true }).some((animation) => animation.playState === 'running' && animation.effect?.target === element)) moving.push(labels.length - 1)
	}
	return ${full} ? { labels, hashes, full, moving } : { labels, hashes }
})()`
}

/** The path of each prerendered page of a build. */
function findPages(root: string): string[] {
	return globSync('**/index.html', { cwd: root })
		.map((file) => `/${file.replace(/\/?index\.html$/, '')}`)
		.sort()
}

/** The pages of a build that the script opens in `config`. */
function pagesIn(root: string, config: Config, listed: readonly string[] | undefined): string[] {
	// The server gives `__spa-fallback.html` for a missing page, so only a prerendered page counts.
	if (listed) return listed.filter((page) => existsSync(path.join(root, page, 'index.html')))

	const excluded = new Set(
		EXCLUDED_PAGES.filter((entry) => entry.configs.includes(config.name)).map(
			(entry) => entry.page,
		),
	)

	return findPages(root).filter((page) => !excluded.has(page))
}

/**
 * Serves a client directory with the paths of `docs-server.ts`, and gives its
 * origin.
 */
async function serve(root: string): Promise<{ origin: string; close: () => void }> {
	const server = createServer(async (request, response) => {
		const file = await resolveFile(root, request.url ?? '/')

		if (file === undefined) {
			response.writeHead(400).end()

			return
		}

		const type = TYPES[path.extname(file)] ?? 'application/octet-stream'

		response.writeHead(200, { 'content-type': type }).end(await readFile(file))
	})

	await new Promise<void>((done) => server.listen(0, 'localhost', done))

	return {
		origin: `http://localhost:${(server.address() as AddressInfo).port}`,
		close: () => server.close(),
	}
}

/** Stops the run when the root does not show the theme and the density step of `config`. */
async function checkRoot(page: Page, config: Config): Promise<void> {
	const step = levelToStep[config.density]

	const expected = [
		...(config.theme === 'dark' ? ['dark'] : []),
		...(step in rootDensityClasses
			? [rootDensityClasses[step as keyof typeof rootDensityClasses]]
			: []),
	]

	const marks = ['dark', ...Object.values(rootDensityClasses)]

	const actual = await page.evaluate(
		(names) => names.filter((name) => document.documentElement.classList.contains(name)),
		marks,
	)

	if (actual.join(' ') !== expected.join(' ')) {
		throw new Error(
			`density-parity: in ${config.name}, the root has \`${actual.join(' ')}\`, not \`${expected.join(' ')}\`.`,
		)
	}
}

/** Opens `route` and reads the style of each element, after the page settles. */
async function readPage(page: Page, origin: string, route: string, full: boolean) {
	await page.goto(`${origin}${route}`)

	await page.waitForFunction(HYDRATED, null, { timeout: PAGE_TIMEOUT })

	await page.waitForFunction(STYLED, null, { timeout: PAGE_TIMEOUT })

	await page.waitForLoadState('networkidle', { timeout: PAGE_TIMEOUT })

	await page.waitForFunction(STILL, null, { timeout: PAGE_TIMEOUT })

	await page.waitForTimeout(SETTLE)

	return (await page.evaluate(readExpression(full))) as PageDump
}

/** Reads each page in one config, in one browser context. */
async function dumpConfig(
	browser: Browser,
	origin: string,
	config: Config,
	pages: readonly string[],
	full: boolean,
): Promise<Record<string, PageDump>> {
	const context = await browser.newContext({
		viewport: { width: config.width, height: HEIGHT },
		colorScheme: config.theme,
		reducedMotion: 'reduce',
	})

	const storage = { [THEME.key]: config.theme, [DENSITY.key]: config.density }

	await context.addInitScript((entries) => {
		for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value)
	}, storage)

	const result: Record<string, PageDump> = {}

	try {
		const page = await context.newPage()

		for (const route of pages) {
			try {
				result[route] = await readPage(page, origin, route, full)
			} catch (error) {
				result[route] = { labels: [], hashes: [], error: String(error).split('\n')[0] }

				continue
			}

			await checkRoot(page, config)
		}
	} finally {
		await context.close()
	}

	return result
}

/**
 * Dumps a client directory. The configs run side by side, each in its own
 * browser context.
 */
async function dumpBuild(root: string, options: DumpOptions): Promise<Dump> {
	const directory = path.resolve(root)

	await stat(path.join(directory, '__spa-fallback.html')).catch(() => {
		throw new Error(`density-parity: no docs build is at ${directory}.`)
	})

	const { origin, close } = await serve(directory)

	const browser = await chromium.launch()

	try {
		const results = await Promise.all(
			options.configs.map(
				async (config) =>
					[
						config.name,
						await dumpConfig(
							browser,
							origin,
							config,
							pagesIn(directory, config, options.pages),
							options.full,
						),
					] as const,
			),
		)

		return Object.fromEntries(results)
	} finally {
		await browser.close()

		close()
	}
}

/** A run of elements that is in one dump and not in the other, as index ranges. */
type Gap = { base: [number, number]; candidate: [number, number] }

/**
 * The longest common subsequence of two lists of hashes, as the index pairs of
 * its elements, in order.
 */
function commonPairs(x: readonly string[], y: readonly string[]): [number, number][] {
	const lengths = Array.from({ length: x.length + 1 }, () => new Uint32Array(y.length + 1))

	const at = (i: number, j: number) => (lengths[i] as Uint32Array)[j] ?? 0

	for (let i = x.length - 1; i >= 0; i--) {
		for (let j = y.length - 1; j >= 0; j--) {
			;(lengths[i] as Uint32Array)[j] =
				x[i] === y[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1))
		}
	}

	const common: [number, number][] = []

	let i = 0

	let j = 0

	while (i < x.length && j < y.length) {
		if (x[i] === y[j]) common.push([i++, j++])
		else if (at(i, j + 1) >= at(i + 1, j)) j++
		else i++
	}

	return common
}

/**
 * Aligns two lists of hashes. Lists of one length align by index. Lists of two
 * lengths align by their longest common subsequence. It gives the pairs of
 * elements that hold the same position in the two lists and differ, and the
 * runs that one list adds or removes.
 */
function align(
	x: readonly string[],
	y: readonly string[],
): { pairs: [number, number][]; gaps: Gap[] } {
	const pairs: [number, number][] = []

	const gaps: Gap[] = []

	if (x.length === y.length) {
		for (const [i, hash] of x.entries()) if (hash !== y[i]) pairs.push([i, i])

		return { pairs, gaps }
	}

	let i0 = 0

	let j0 = 0

	for (const [i1, j1] of [...commonPairs(x, y), [x.length, y.length]] as const) {
		// A gap of one length on both sides holds changed elements. Any other gap adds or removes elements.
		if (i1 - i0 === j1 - j0) for (let d = 0; d < i1 - i0; d++) pairs.push([i0 + d, j0 + d])
		else gaps.push({ base: [i0, i1], candidate: [j0, j1] })

		i0 = i1 + 1

		j0 = j1 + 1
	}

	return { pairs, gaps }
}

/** The style of one element, as a map from each property to its value. */
function readProperties(state: State): Map<string, string> {
	const properties = new Map<string, string>()

	for (const [prefix, text] of [
		['', state[0]],
		['::before ', state[1]],
		['::after ', state[2]],
	] as const) {
		for (const declaration of text.split(';')) {
			const colon = declaration.indexOf(':')

			if (colon > 0)
				properties.set(prefix + declaration.slice(0, colon), declaration.slice(colon + 1))
		}
	}

	return properties
}

/** The properties that differ between two states, with the value of each side. */
function findChanges(a: State, b: State): [name: string, base: string, candidate: string][] {
	const p = readProperties(a)

	const q = readProperties(b)

	const names = new Set([...p.keys(), ...q.keys()])

	return [...names]
		.filter((name) => p.get(name) !== q.get(name))
		.map((name) => [name, p.get(name) ?? '(none)', q.get(name) ?? '(none)'])
}

/** The result of the diff of one page in one config. */
type PageDiff = {
	/** The elements that the diff reads in both dumps. */
	states: number
	/** The lines of the report: the differences that stay. */
	lines: string[]
	/** The lines of the report for the differences that the noise filter explains. */
	noise: string[]
	/** The count of the differences that stay. */
	unexplained: number
}

/** The line of one changed element, with the values when `detail` is set. */
function describeChange(
	index: string,
	label: string,
	changes: [string, string, string][],
	detail: boolean,
): string {
	const text = detail
		? changes.map(([name, a, b]) => `${name}: ${a} -> ${b}`).join(' | ')
		: changes.map(([name]) => name).join(', ')

	return `    element ${index} <${label}>: ${text}`
}

/** The diff of one page that loaded in both dumps. */
function diffPage(base: PageDump, candidate: PageDump, detail: boolean): PageDiff {
	const { pairs, gaps } = align(base.hashes, candidate.hashes)

	const result: PageDiff = {
		states: Math.min(base.hashes.length, candidate.hashes.length),
		lines: [],
		noise: [],
		unexplained: 0,
	}

	for (const {
		base: [i0, i1],
		candidate: [j0, j1],
	} of gaps) {
		result.unexplained += Math.abs(i1 - i0 - (j1 - j0))

		result.lines.push(
			`    base [${i0}, ${i1}) ${base.labels.slice(i0, i1).join(' ')} | candidate [${j0}, ${j1}) ${candidate.labels.slice(j0, j1).join(' ')}`,
		)
	}

	for (const [i, j] of pairs) {
		const index = i === j ? String(i) : `${i}/${j}`

		const label = base.labels[i] ?? '?'

		const a = base.full?.[i]

		const b = candidate.full?.[j]

		if (!a || !b) {
			result.unexplained++

			result.lines.push(
				`    element ${index} <${label}>: the style differs (dump with --full for the properties)`,
			)

			continue
		}

		const changes = findChanges(a, b)

		const line = describeChange(index, label, changes, detail)

		const moving = base.moving?.includes(i) || candidate.moving?.includes(j)

		if (moving && changes.every(([name]) => ANIMATED.test(name))) {
			result.noise.push(line)

			continue
		}

		result.unexplained++

		result.lines.push(line)
	}

	return result
}

/** The totals of a diff. */
type Totals = { pages: number; states: number; unexplained: number; noise: number }

/** The report and the totals of the diff of two dumps. */
type Report = {
	lines: string[]
	totals: Totals
	/** The pages of each config with a difference in style, which a second pass can explain. */
	flagged: Record<string, string[]>
	/** The lines of the pages that are in one build only or did not load. A second pass does not open them. */
	settled: string[]
}

/** The cap on the lines of each page, with no `--detail`. */
const LINES_PER_PAGE = 12

/** Adds the diff of one page to the report. */
function reportPage(
	report: Report,
	config: string,
	route: string,
	base: PageDump | undefined,
	candidate: PageDump | undefined,
	detail: boolean,
): void {
	const settle = (line: string) => {
		report.totals.unexplained++

		report.lines.push(line)

		report.settled.push(line)
	}

	if (!base || !candidate) {
		settle(`${config} ${route}: the page is only in the ${base ? 'base' : 'candidate'} build`)

		return
	}

	if (base.error || candidate.error) {
		settle(`${config} ${route}: the page did not load: ${base.error ?? candidate.error}`)

		return
	}

	report.totals.pages++

	const diff = diffPage(base, candidate, detail)

	report.totals.states += diff.states

	report.totals.noise += diff.noise.length

	if (detail && diff.noise.length > 0) {
		report.lines.push(
			`${config} ${route}: ${diff.noise.length} animation differences (noise)`,
			...diff.noise,
		)
	}

	if (diff.unexplained === 0) return

	const shown = detail ? diff.lines : diff.lines.slice(0, LINES_PER_PAGE)

	const more = diff.lines.length - shown.length

	report.totals.unexplained += diff.unexplained

	report.flagged[config] = [...(report.flagged[config] ?? []), route]

	report.lines.push(
		`${config} ${route}: ${diff.unexplained} differences in ${base.hashes.length}/${candidate.hashes.length} elements`,
		...shown,
		...(more > 0 ? [`    … ${more} more (use --detail)`] : []),
	)
}

/** Compares two dumps, config by config and page by page. */
function diffDumps(base: Dump, candidate: Dump, detail: boolean): Report {
	const report: Report = {
		lines: [],
		totals: { pages: 0, states: 0, unexplained: 0, noise: 0 },
		flagged: {},
		settled: [],
	}

	for (const config of new Set([...Object.keys(base), ...Object.keys(candidate)])) {
		const a = base[config] ?? {}

		const b = candidate[config] ?? {}

		for (const route of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
			reportPage(report, config, route, a[route], b[route], detail)
		}
	}

	return report
}

/** The exclusions of the run, for the head of the report. */
function exclusions(): string[] {
	return [
		'Excluded:',
		...EXCLUDED_PAGES.map(
			({ page, configs, reason }) => `  page ${page} in ${configs.join(', ')}: ${reason}`,
		),
		...EXCLUDED_REGIONS.map(({ selector, reason }) => `  region ${selector}: ${reason}`),
	]
}

/** Prints a report, and sets the exit code when a difference stays. */
function finish(report: Report, summary: Record<string, number>): void {
	console.log([...exclusions(), '', ...report.lines].join('\n'))

	console.log(JSON.stringify({ ...report.totals, ...summary }))

	if (report.totals.unexplained > 0) process.exitCode = 1
}

/** The configs that `--config` selects, or each config. */
function selectConfigs(names: string | undefined): readonly Config[] {
	if (!names) return CONFIGS

	const wanted = names.split(',')

	const configs = CONFIGS.filter((config) => wanted.includes(config.name))

	if (configs.length !== wanted.length) {
		throw new Error(
			`density-parity: the configs are ${CONFIGS.map((config) => config.name).join(', ')}, not \`${names}\`.`,
		)
	}

	return configs
}

/**
 * Dumps two builds, and diffs them. It then dumps each page with a difference in
 * style again with the full style, one build and one config at a time, and diffs
 * that second pass with the noise filter. The exit code counts the second pass,
 * and each page of the first pass that is in one build only or did not load.
 */
async function compare(
	baseDir: string,
	candidateDir: string,
	options: DumpOptions & { detail: boolean },
) {
	const first = diffDumps(
		await dumpBuild(baseDir, options),
		await dumpBuild(candidateDir, options),
		false,
	)

	const flaggedPages = Object.values(first.flagged).reduce(
		(sum, pages) => sum + new Set(pages).size,
		0,
	)

	console.error(
		`density-parity: the first pass read ${first.totals.states} element states, flagged ${flaggedPages} pages for a second pass, and found ${first.settled.length} pages that are in one build only or did not load.`,
	)

	for (const [config, pages] of Object.entries(first.flagged)) {
		console.error(`  ${config}: ${[...new Set(pages)].join(' ')}`)
	}

	const second: Report = {
		lines: [...first.settled],
		totals: { pages: 0, states: 0, unexplained: first.settled.length, noise: 0 },
		flagged: {},
		settled: [],
	}

	for (const config of options.configs) {
		const pages = [...new Set(first.flagged[config.name] ?? [])]

		if (pages.length === 0) continue

		const rerun = { configs: [config], pages, full: true }

		const again = diffDumps(
			await dumpBuild(baseDir, rerun),
			await dumpBuild(candidateDir, rerun),
			options.detail,
		)

		second.lines.push(...again.lines)

		second.totals.unexplained += again.totals.unexplained

		second.totals.noise += again.totals.noise
	}

	finish(
		{
			...second,
			totals: {
				...first.totals,
				unexplained: second.totals.unexplained,
				noise: second.totals.noise,
			},
		},
		{ flaggedPages },
	)
}

const { positionals, values } = parseArgs({
	allowPositionals: true,
	options: {
		detail: { type: 'boolean', default: false },
		full: { type: 'boolean', default: false },
		pages: { type: 'string' },
		config: { type: 'string' },
	},
})

const [command, first, second, ...extra] = positionals

const options: DumpOptions & { detail: boolean } = {
	configs: selectConfigs(values.config),
	pages: values.pages?.split(','),
	full: values.full,
	detail: values.detail,
}

if (!first || !second || extra.length > 0) {
	throw new Error(
		'density-parity: give `compare <base dir> <candidate dir>`, `dump <client dir> <out.json>`, or `diff <base.json> <candidate.json>`.',
	)
}

if (command === 'compare') {
	await compare(first, second, options)
} else if (command === 'dump') {
	await writeFile(second, JSON.stringify(await dumpBuild(first, options)))
} else if (command === 'diff') {
	const read = async (file: string) => JSON.parse(await readFile(file, 'utf8')) as Dump

	finish(diffDumps(await read(first), await read(second), options.detail), {})
} else {
	throw new Error(`density-parity: the commands are compare, dump, and diff, not \`${command}\`.`)
}
