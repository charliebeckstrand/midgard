/**
 * Measures the load of the docs app. The turbo task `docs:bench` builds the
 * app first.
 *
 * The script serves the build over HTTP/2 with TLS and brotli, as a CDN does,
 * with the paths of `docs-server.ts`. It also sends the responses in the
 * order of their priority, as a CDN does ({@link createDownlink}). Chromium
 * opens `/button` cold at 390 px, with the CPU four times slower and the
 * network of Lighthouse "Slow 4G". The table gives the median of each value:
 *
 * - FCP and LCP, from the paint entries of the page.
 * - TBT: the time over 50 ms of each long task, from the start of the
 *   navigation to 3 s after hydration.
 * - JS and requests: the brotli size of the scripts and the count of the
 *   requests, the document included, that start before hydration.
 * - Page switch: from a click on the Accordion link in the navigation to the
 *   frame that shows the heading of the new page.
 * - Page switch (tap): from the touchstart of a tap on the Alert link to the
 *   frame that shows the heading. The finger stays down for {@link HOLD} ms,
 *   as a real tap does.
 * - Page switch (search): from the Enter key that picks the first result of
 *   the search `spinner` to the frame that shows the heading. The bench types
 *   one key each {@link KEY_GAP} ms. It moves to the first result with the
 *   down arrow {@link READ} ms after the last key, and then presses Enter.
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
import { createSecureServer, type Http2ServerResponse, type SecureServerOptions } from 'node:http2'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { parseArgs, promisify } from 'node:util'
import { brotliCompress, constants } from 'node:zlib'
import { type Browser, type CDPSession, chromium, type Locator, type Page } from 'playwright'
import { getOrCompute } from '../src/utilities/get-or-compute'
import { CLIENT_DIR, fileOf, HYDRATED, TYPES } from './docs-server'

const brotli = promisify(brotliCompress)

const PAGE = '/button'

/** The budget of the docs app on `/button`, from its first pull request. */
const BUDGET = { fcp: 700, requests: 16 }

/** The download rate of the "Slow 4G" network of Lighthouse, in bytes per second. */
const DOWNLOAD_RATE = (1.6 * 1024 * 1024) / 8

/**
 * The "Slow 4G" network of Lighthouse, as the measurements of the plan use it.
 * Chromium adds the latency and limits the upload. The server limits the
 * download ({@link createDownlink}), so `-1` turns off the download limit of
 * Chromium.
 */
const SLOW_4G = {
	offline: false,
	latency: 150,
	downloadThroughput: -1,
	uploadThroughput: (750 * 1024) / 8,
}

/** How often the downlink sends the bytes of its rate, in ms. */
const DOWNLINK_TICK = 5

/** The urgency of a request with no `priority` header (RFC 9218). */
const DEFAULT_URGENCY = 3

/** A response body that the downlink sends. */
type Transfer = {
	/** The stream id. A lower id is an earlier request. */
	id: number
	urgency: number
	incremental: boolean
	response: Http2ServerResponse
	body: Buffer
	sent: number
}

/**
 * Reads the urgency and the incremental flag of a `priority` header, such as
 * `u=1` or `u=0, i` (RFC 9218).
 */
function priorityOf(header: string | string[] | undefined): {
	urgency: number
	incremental: boolean
} {
	// An array joins with commas, as the fields of one header do.
	const fields = String(header ?? '')
		.split(',')
		.map((field) => field.trim())

	const urgency = Number(fields.find((field) => field.startsWith('u='))?.slice(2))

	return {
		urgency: Number.isInteger(urgency) ? urgency : DEFAULT_URGENCY,
		incremental: fields.includes('i') || fields.includes('i=?1'),
	}
}

/**
 * Sends response bodies at {@link DOWNLOAD_RATE}, in the order of their
 * priority, as a CDN does (RFC 9218). The lowest urgency goes first. Of one
 * urgency, a body that is not incremental goes whole, in the order of the
 * requests, and incremental bodies share the rate.
 *
 * The download limit of Chromium shares the rate among the requests, and it
 * ignores their priority. Thus a change to the priority of a request does not
 * change the measurements of that limit.
 */
function createDownlink(rate: number): {
	send: (transfer: Omit<Transfer, 'sent'>) => void
	close: () => void
} {
	let transfers: Transfer[] = []

	let credit = 0

	let last = performance.now()

	const tick = () => {
		const now = performance.now()

		credit += ((now - last) / 1000) * rate

		last = now

		transfers = transfers.filter((transfer) => !transfer.response.stream.closed)

		// A link with nothing to send does not keep its rate for later.
		if (transfers.length === 0) credit = 0

		while (credit >= 1 && transfers.length > 0) {
			const urgency = Math.min(...transfers.map((transfer) => transfer.urgency))

			const top = transfers.filter((transfer) => transfer.urgency === urgency)

			const whole = top.filter((transfer) => !transfer.incremental)

			const next = whole.length > 0 ? [whole.reduce((a, b) => (a.id < b.id ? a : b))] : top

			const share = Math.max(1, Math.floor(credit / next.length))

			for (const transfer of next) {
				const end = Math.min(transfer.sent + share, transfer.body.length)

				transfer.response.write(transfer.body.subarray(transfer.sent, end))

				credit -= end - transfer.sent

				transfer.sent = end

				if (end === transfer.body.length) {
					transfer.response.end()

					transfers = transfers.filter((other) => other !== transfer)
				}
			}
		}
	}

	const timer = setInterval(tick, DOWNLINK_TICK)

	return {
		send: (transfer) => {
			transfers.push({ ...transfer, sent: 0 })
		},
		close: () => clearInterval(timer),
	}
}

/** How long the finger stays down in a tap. A real tap lasts about this long. */
const HOLD = 100

/** The time between two keys of the search, as a fast reader types. */
const KEY_GAP = 120

/** The time that the reader takes to read a short list of results before a pick. */
const READ = 600

/** The kinds of file that the server sends with brotli. */
const COMPRESSED = new Set(['.css', '.html', '.js', '.json', '.svg'])

type Sample = {
	fcp: number
	lcp: number
	tbt: number
	js: number
	requests: number
	switch: number
	tap: number
	search: number
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

/** Serves the docs build over HTTP/2 through a downlink of "Slow 4G", and gives its origin. */
async function serve(tls: SecureServerOptions): Promise<{ origin: string; close: () => void }> {
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

	const downlink = createDownlink(DOWNLOAD_RATE)

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

		response.writeHead(200, {
			'content-type': TYPES[extension] ?? 'application/octet-stream',
			// The name of each file in `assets/` holds the hash of its content.
			'cache-control': pathname.startsWith('/assets/')
				? 'public, max-age=31536000, immutable'
				: 'no-cache',
			...(compress ? { 'content-encoding': 'br' } : {}),
		})

		downlink.send({
			id: response.stream.id ?? 0,
			...priorityOf(request.headers.priority),
			response,
			body,
		})
	})

	await new Promise<void>((done) => server.listen(0, 'localhost', done))

	return {
		origin: `https://localhost:${(server.address() as AddressInfo).port}`,
		close: () => {
			downlink.close()

			server.close()
		},
	}
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

/**
 * Marks the next event of the type `trigger`, and the frame after it that
 * shows the heading `heading`.
 */
function watchSwitch(trigger: string, heading: string): string {
	return `{
	const readings = window.__bench

	readings.switchEnd = undefined

	const watch = (time) => {
		if (document.querySelector('h1')?.textContent?.trim() === ${JSON.stringify(heading)}) readings.switchEnd = time
		else requestAnimationFrame(watch)
	}

	document.addEventListener(
		${JSON.stringify(trigger)},
		() => {
			readings.switchStart = performance.now()

			requestAnimationFrame(watch)
		},
		{ capture: true, once: true },
	)
}`
}

/** Reads the load values of the page. */
function readLoad(): Omit<Sample, 'switch' | 'tap' | 'search'> {
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

/** Waits for the page switch that {@link watchSwitch} marks, and gives its time. */
async function switchTime(page: Page): Promise<number> {
	await page.waitForFunction(() => window.__bench.switchEnd !== undefined, null, {
		timeout: 60_000,
	})

	const { switchStart = 0, switchEnd = 0 } = await page.evaluate(() => window.__bench)

	return switchEnd - switchStart
}

/**
 * Taps the center of `target` with one finger through CDP. The finger stays
 * down for {@link HOLD} ms, so the touch events have the timing of a real tap.
 */
async function tap(page: Page, cdp: CDPSession, target: Locator): Promise<void> {
	// The checks of a tap, with no tap: the target is visible, stable, and gets the events.
	await target.tap({ trial: true })

	const box = await target.boundingBox()

	if (!box) throw new Error('docs:bench: the tap target has no box.')

	const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

	await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })

	await page.waitForTimeout(HOLD)

	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

/**
 * One cold run: the load of the page, and then a page switch with a click,
 * one with a tap, and one with a pick in the search.
 */
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

		await page.evaluate(watchSwitch('click', 'Accordion'))

		await link.click()

		const click = await switchTime(page)

		await tap(page, cdp, page.getByRole('button', { name: 'Open navigation' }))

		const alert = page.getByRole('link', { name: 'Alert', exact: true })

		await alert.waitFor()

		await page.evaluate(watchSwitch('touchstart', 'Alert'))

		await tap(page, cdp, alert)

		const touch = await switchTime(page)

		await tap(page, cdp, page.getByRole('button', { name: 'Open navigation' }))

		await tap(page, cdp, page.getByRole('button', { name: 'Search docs' }))

		await page.getByRole('combobox').waitFor()

		await page.keyboard.type('spinner', { delay: KEY_GAP })

		await page.waitForTimeout(READ)

		await page.keyboard.press('ArrowDown')

		await page.evaluate(watchSwitch('keydown', 'Loading'))

		await page.keyboard.press('Enter')

		return { ...load, switch: click, tap: touch, search: await switchTime(page) }
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
		['Page switch (tap)', 'tap', 'ms', ''],
		['Page switch (search)', 'search', 'ms', ''],
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

const { origin, close } = await serve(tls)

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

	close()
}

console.log(`\n${table(samples)}\n\n${runs} cold runs, medians.`)

if (out) writeFileSync(out, `${JSON.stringify(samples, null, '\t')}\n`)
