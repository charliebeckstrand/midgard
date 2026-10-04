/**
 * Compares the load of the docs app with the load of the legacy app, for
 * `pnpm --filter ui docs:bench`. Build the two apps first, with `docs:build`
 * and `docs:legacy:build`.
 *
 * The script serves each build over HTTP/2 with TLS and brotli, as a CDN
 * does, with the paths of `docs-server.ts`. Chromium opens `/button` cold at
 * 390 px, with the CPU four times slower and the network of Lighthouse
 * "Slow 4G". The runs of the two apps interleave, and the table gives the
 * median of each value:
 *
 * - FCP and LCP, from the paint entries of the page.
 * - TBT: the time over 50 ms of each long task, from the start of the
 *   navigation to 3 s after hydration.
 * - JS and requests: the brotli size of the scripts and the count of the
 *   requests, the document included, that start before hydration.
 * - Page switch: from a click on the Accordion link in the navigation to the
 *   frame that shows the heading of the new page.
 *
 * ```sh
 * pnpm --filter ui docs:bench                 # 9 runs of each app
 * pnpm --filter ui docs:bench 15 samples.json # 15 runs, and each sample in a file
 * ```
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { createSecureServer, type Http2SecureServer, type SecureServerOptions } from 'node:http2'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { brotliCompress, constants } from 'node:zlib'
import { type Browser, chromium } from 'playwright'
import { clientDirOf, type DocsApp, fileOf, TYPES } from './docs-server'

const APPS: readonly DocsApp[] = ['docs-legacy', 'docs']

const PAGE = '/button'

/** The budget of the first pull request of the new app, on `/button`. */
const BUDGET = { fcp: 700, tbt: 150, js: 180, requests: 16 }

/** The "Slow 4G" network of Lighthouse, as the measurements of the plan use it. */
const SLOW_4G = {
	offline: false,
	latency: 150,
	downloadThroughput: (1.6 * 1024 * 1024) / 8,
	uploadThroughput: (750 * 1024) / 8,
}

/** The kinds of file that the server sends with brotli. */
const COMPRESSED = new Set(['.css', '.html', '.js', '.json', '.svg'])

type Sample = {
	app: DocsApp
	fcp: number
	lcp: number
	tbt: number
	js: number
	requests: number
	switch: number
}

type Metric = Exclude<keyof Sample, 'app'>

/** The readings that the page collects for the bench. */
type Readings = {
	lcp: number
	longTasks: [start: number, duration: number][]
	hydrated?: number
	switchStart?: number
	switchEnd?: number
}

declare global {
	interface Window {
		__bench: Readings
	}
}

/** A certificate for `localhost` that signs itself, from `openssl`. */
function createCertificate(): SecureServerOptions {
	const dir = mkdtempSync(path.join(tmpdir(), 'docs-bench-'))

	const key = path.join(dir, 'key.pem')

	const cert = path.join(dir, 'cert.pem')

	try {
		execFileSync(
			'openssl',
			[
				'req',
				'-x509',
				'-newkey',
				'ec',
				'-pkeyopt',
				'ec_paramgen_curve:prime256v1',
				'-nodes',
				'-days',
				'1',
				'-subj',
				'/CN=localhost',
				'-keyout',
				key,
				'-out',
				cert,
			],
			{ stdio: 'ignore' },
		)

		return { key: readFileSync(key), cert: readFileSync(cert) }
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
}

/** Serves the build of an app over HTTP/2, and gives its origin. */
async function serve(
	app: DocsApp,
	tls: SecureServerOptions,
): Promise<{ origin: string; server: Http2SecureServer }> {
	const root = clientDirOf(app)

	await stat(root).catch(() => {
		throw new Error(`Build the ${app} app first: no build is at ${root}.`)
	})

	// The server compresses each file once, as a CDN keeps the compressed file.
	const bodies = new Map<string, Promise<Buffer>>()

	const bodyOf = (file: string, compress: boolean): Promise<Buffer> => {
		const key = `${compress ? 'br' : 'raw'}:${file}`

		let body = bodies.get(key)

		if (!body) {
			body = readFile(file).then((data) =>
				compress
					? new Promise<Buffer>((done, fail) =>
							brotliCompress(
								data,
								{ params: { [constants.BROTLI_PARAM_QUALITY]: 9 } },
								(error, out) => (error ? fail(error) : done(out)),
							),
						)
					: data,
			)

			bodies.set(key, body)
		}

		return body
	}

	const server = createSecureServer(tls, async (request, response) => {
		const { pathname } = new URL(request.url, 'https://localhost')

		const file = await fileOf(root, pathname)

		const extension = path.extname(file)

		const compress =
			COMPRESSED.has(extension) && String(request.headers['accept-encoding']).includes('br')

		const body = await bodyOf(file, compress)

		// The browser closes the streams of a run that ends.
		if (response.stream.closed) return

		response
			.writeHead(200, {
				'content-type': TYPES[extension] ?? 'application/octet-stream',
				// The name of each file in `assets/` holds the hash of its content.
				'cache-control': pathname.startsWith('/assets/')
					? 'public, max-age=31536000, immutable'
					: 'no-cache',
				...(compress ? { 'content-encoding': 'br' } : {}),
			})
			.end(body)
	})

	await new Promise<void>((done) => server.listen(0, 'localhost', done))

	return { origin: `https://localhost:${(server.address() as AddressInfo).port}`, server }
}

// The code below runs in the page, and it is text: the TypeScript runner of
// the bench wraps each named function in a helper that the page does not have.

/** Runs before the scripts of the page, and collects the readings in `window.__bench`. */
const OBSERVE = `{
	const readings = { lcp: 0, longTasks: [] }

	window.__bench = readings

	new PerformanceObserver((list) => {
		for (const task of list.getEntries()) readings.longTasks.push([task.startTime, task.duration])
	}).observe({ type: 'longtask', buffered: true })

	new PerformanceObserver((list) => {
		for (const paint of list.getEntries()) readings.lcp = paint.startTime
	}).observe({ type: 'largest-contentful-paint', buffered: true })

	// Hydration gives the heading a React fiber. A prerendered heading has none.
	const watch = () => {
		const heading = document.querySelector('h1')

		if (heading && Object.keys(heading).some((key) => key.startsWith('__reactFiber'))) {
			readings.hydrated = performance.now()
		} else {
			requestAnimationFrame(watch)
		}
	}

	requestAnimationFrame(watch)
}`

/** Marks the next click, and the frame after it that shows the heading of the Accordion page. */
const WATCH_SWITCH = `{
	const readings = window.__bench

	const watch = (time) => {
		if (document.querySelector('h1')?.textContent?.trim() === 'Accordion') readings.switchEnd = time
		else requestAnimationFrame(watch)
	}

	document.addEventListener(
		'click',
		() => {
			readings.switchStart = performance.now()

			requestAnimationFrame(watch)
		},
		{ capture: true, once: true },
	)
}`

/** Reads the load values of the page. */
function readLoad(): Omit<Sample, 'app' | 'switch'> {
	const { lcp, longTasks, hydrated = 0 } = window.__bench

	const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0

	const early = performance
		.getEntriesByType('resource')
		.filter((entry) => entry.startTime < hydrated) as PerformanceResourceTiming[]

	const js = early
		.filter((entry) => new URL(entry.name).pathname.endsWith('.js'))
		.reduce((sum, entry) => sum + entry.transferSize, 0)

	const tbt = longTasks
		.filter(([start]) => start < hydrated + 3000)
		.reduce((sum, [, duration]) => sum + Math.max(0, duration - 50), 0)

	return { fcp, lcp, tbt, js: js / 1024, requests: early.length + 1 }
}

/** One cold run of an app: the load of the page, and then a page switch. */
async function run(browser: Browser, app: DocsApp, origin: string): Promise<Sample> {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 3,
		isMobile: true,
		hasTouch: true,
		ignoreHTTPSErrors: true,
	})

	try {
		const page = await context.newPage()

		await page.addInitScript(OBSERVE)

		const cdp = await context.newCDPSession(page)

		await cdp.send('Network.enable')

		await cdp.send('Network.emulateNetworkConditions', SLOW_4G)

		await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

		await page.goto(`${origin}${PAGE}`)

		await page.waitForFunction(() => window.__bench.hydrated !== undefined, null, {
			timeout: 60_000,
		})

		await page.waitForLoadState('networkidle')

		await page.waitForTimeout(3000)

		const load = await page.evaluate(readLoad)

		await page.getByRole('button', { name: 'Open navigation' }).click()

		const link = page.getByRole('link', { name: 'Accordion', exact: true })

		await link.waitFor()

		await page.evaluate(WATCH_SWITCH)

		await link.click()

		await page.waitForFunction(() => window.__bench.switchEnd !== undefined, null, {
			timeout: 60_000,
		})

		const { switchStart = 0, switchEnd = 0 } = await page.evaluate(() => window.__bench)

		return { app, ...load, switch: switchEnd - switchStart }
	} finally {
		await context.close()
	}
}

function median(values: readonly number[]): number {
	const sorted = values.toSorted((a, b) => a - b)

	const middle = sorted.length >> 1

	return sorted.length % 2
		? (sorted[middle] ?? 0)
		: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

/** The table of medians, in Markdown. */
function table(samples: readonly Sample[]): string {
	const of = (app: DocsApp, metric: Metric) =>
		median(samples.filter((sample) => sample.app === app).map((sample) => sample[metric]))

	const rows: [label: string, metric: Metric, unit: string, budget: string][] = [
		['FCP', 'fcp', 'ms', `< ${BUDGET.fcp} ms`],
		['LCP', 'lcp', 'ms', 'lower than legacy'],
		['TBT', 'tbt', 'ms', `< ${BUDGET.tbt} ms`],
		['JS to hydration (brotli)', 'js', 'KB', `< ${BUDGET.js} KB`],
		['Requests to hydration', 'requests', '', `< ${BUDGET.requests}`],
		['Page switch', 'switch', 'ms', 'faster than legacy'],
	]

	const lines = rows.map(([label, metric, unit, budget]) => {
		const cells = APPS.map((app) => `${Math.round(of(app, metric))}${unit ? ` ${unit}` : ''}`)

		return `| ${label} | ${cells.join(' | ')} | ${budget} |`
	})

	return ['| `/button` | Legacy | New | Budget |', '|---|---|---|---|', ...lines].join('\n')
}

const [runs = '9', out] = process.argv.slice(2)

const tls = createCertificate()

const servers = await Promise.all(APPS.map((app) => serve(app, tls)))

const browser = await chromium.launch()

const samples: Sample[] = []

try {
	for (let index = 0; index < Number(runs); index++) {
		for (const [position, app] of APPS.entries()) {
			const sample = await run(browser, app, servers[position]?.origin ?? '')

			samples.push(sample)

			console.log(JSON.stringify(sample))
		}
	}
} finally {
	await browser.close()

	for (const { server } of servers) server.close()
}

console.log(`\n${table(samples)}\n\n${runs} cold runs of each app, medians.`)

if (out) writeFileSync(out, `${JSON.stringify(samples, null, '\t')}\n`)
