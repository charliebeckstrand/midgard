/**
 * Measures the load of the docs app. The turbo task `docs:bench` builds the
 * app first.
 *
 * The script serves the build over HTTP/2 with TLS and brotli, as a CDN does,
 * with the paths of `docs-server.ts`. Chromium opens `/button` cold at 390 px,
 * with the CPU four times slower and the network of Lighthouse "Slow 4G". The
 * table gives the median of each value:
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
 * pnpm turbo run docs:bench --filter=ui                    # 9 runs
 * pnpm turbo run docs:bench --filter=ui -- 15 samples.json # 15 runs, and each sample in a file
 * ```
 *
 * A count that is not a positive integer, a third argument, or an option stops
 * the script before the first run.
 */

import { generateKeyPairSync, sign } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { createSecureServer, type Http2SecureServer, type SecureServerOptions } from 'node:http2'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { parseArgs, promisify } from 'node:util'
import { brotliCompress, constants } from 'node:zlib'
import { type Browser, chromium } from 'playwright'
import { getOrCompute } from '../src/utilities/get-or-compute'
import { CLIENT_DIR, fileOf, HYDRATED, TYPES } from './docs-server'

const brotli = promisify(brotliCompress)

const PAGE = '/button'

/** The budget of the docs app on `/button`, from its first pull request. */
const BUDGET = { fcp: 700, requests: 16 }

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
	fcp: number
	lcp: number
	tbt: number
	js: number
	requests: number
	switch: number
}

type Metric = keyof Sample

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

/** A DER element: the tag, the length of the content, and the content. */
function der(tag: number, ...content: Buffer[]): Buffer {
	const body = Buffer.concat(content)

	const bytes: number[] = []

	for (let rest = body.length; rest > 0; rest >>= 8) bytes.unshift(rest & 0xff)

	// A length below 128 is one byte. A longer length gives the count of its bytes first.
	const length = body.length < 0x80 ? [body.length] : [0x80 | bytes.length, ...bytes]

	return Buffer.concat([Buffer.of(tag, ...length), body])
}

/** A UTC time of X.509, such as `261004120000Z`. */
function utcTime(date: Date): Buffer {
	return der(0x17, Buffer.from(`${date.toISOString().slice(2, 19).replace(/[-T:]/g, '')}Z`))
}

/**
 * A certificate for `localhost` that signs itself, with an ECDSA P-256 key.
 * Chromium needs TLS for HTTP/2, and the bench tells it to accept this
 * certificate.
 */
function createCertificate(): SecureServerOptions {
	const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })

	// ecdsa-with-SHA256 (1.2.840.10045.4.3.2).
	const algorithm = der(0x30, der(0x06, Buffer.of(0x2a, 0x86, 0x48, 0xce, 0x3d, 0x04, 0x03, 0x02)))

	// CN=localhost: the common name is 2.5.4.3.
	const name = der(
		0x30,
		der(
			0x31,
			der(0x30, der(0x06, Buffer.of(0x55, 0x04, 0x03)), der(0x0c, Buffer.from('localhost'))),
		),
	)

	const now = Date.now()

	const certificate = der(
		0x30,
		der(0xa0, der(0x02, Buffer.of(2))),
		der(0x02, Buffer.of(1)),
		algorithm,
		name,
		der(0x30, utcTime(new Date(now - 60_000)), utcTime(new Date(now + 86_400_000))),
		name,
		publicKey.export({ type: 'spki', format: 'der' }),
	)

	const signature = sign('sha256', certificate, privateKey)

	const body = der(0x30, certificate, algorithm, der(0x03, Buffer.of(0), signature))

	const lines = body.toString('base64').match(/.{1,64}/g) ?? []

	return {
		key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
		cert: ['-----BEGIN CERTIFICATE-----', ...lines, '-----END CERTIFICATE-----', ''].join('\n'),
	}
}

/** Serves the docs build over HTTP/2, and gives its origin. */
async function serve(
	tls: SecureServerOptions,
): Promise<{ origin: string; server: Http2SecureServer }> {
	await stat(CLIENT_DIR).catch(() => {
		throw new Error(`Build the docs app first: no build is at ${CLIENT_DIR}.`)
	})

	// The server compresses each file once, as a CDN keeps the compressed file.
	const bodies = new Map<string, Promise<Buffer>>()

	const bodyOf = (file: string, compress: boolean): Promise<Buffer> => {
		const key = `${compress ? 'br' : 'raw'}:${file}`

		return getOrCompute(bodies, key, () =>
			readFile(file).then((data) =>
				compress ? brotli(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }) : data,
			),
		)
	}

	const server = createSecureServer(tls, async (request, response) => {
		const { pathname } = new URL(request.url, 'https://localhost')

		const file = await fileOf(CLIENT_DIR, pathname)

		if (file === undefined) {
			response.writeHead(400).end()

			return
		}

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

	const watch = () => {
		if (${HYDRATED}) readings.hydrated = performance.now()
		else requestAnimationFrame(watch)
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
function readLoad(): Omit<Sample, 'switch'> {
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

/** One cold run: the load of the page, and then a page switch. */
async function run(browser: Browser, origin: string): Promise<Sample> {
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

		return { ...load, switch: switchEnd - switchStart }
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
	const rows: [label: string, metric: Metric, unit: string, budget: string][] = [
		['FCP', 'fcp', 'ms', `< ${BUDGET.fcp} ms`],
		['LCP', 'lcp', 'ms', ''],
		['TBT', 'tbt', 'ms', ''],
		['JS to hydration (brotli)', 'js', 'KB', ''],
		['Requests to hydration', 'requests', '', `< ${BUDGET.requests}`],
		['Page switch', 'switch', 'ms', ''],
	]

	const lines = rows.map(([label, metric, unit, budget]) => {
		const value = Math.round(median(samples.map((sample) => sample[metric])))

		return `| ${label} | ${value}${unit ? ` ${unit}` : ''} | ${budget} |`
	})

	return ['| `/button` | Median | Budget |', '|---|---|---|', ...lines].join('\n')
}

const { positionals } = parseArgs({ allowPositionals: true })

const [count = '9', out, ...extra] = positionals

const runs = Number(count)

if (!Number.isInteger(runs) || runs < 1 || extra.length > 0) {
	throw new Error(
		`docs:bench: give a count of runs and an output file, such as \`15 samples.json\`, not \`${positionals.join(' ')}\`.`,
	)
}

const tls = createCertificate()

const { origin, server } = await serve(tls)

const browser = await chromium.launch()

const samples: Sample[] = []

try {
	for (let index = 0; index < runs; index++) {
		const sample = await run(browser, origin)

		samples.push(sample)

		console.log(JSON.stringify(sample))
	}
} finally {
	await browser.close()

	server.close()
}

console.log(`\n${table(samples)}\n\n${runs} cold runs, medians.`)

if (out) writeFileSync(out, `${JSON.stringify(samples, null, '\t')}\n`)
