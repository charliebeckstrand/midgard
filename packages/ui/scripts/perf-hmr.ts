/**
 * Author save-to-pixel HMR probe.
 *
 * Touches a real source file in `packages/ui`, waits for Vite's HMR WebSocket
 * to ack the update, records the latency. Repeats N times per scenario and
 * reports median + p95.
 *
 * Requires a dev server already running:
 *   pnpm dev   # in another terminal
 *   pnpm perf:hmr
 *
 * The probe writes a marker comment and then restores the original content at
 * the end of each iteration. A SIGINT handler ensures files are restored if
 * the run is aborted.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import WebSocket from 'ws'

type Scenario = {
	label: string
	path: string
}

const SCENARIOS: Scenario[] = [
	{
		label: 'leaf component (button/component.tsx)',
		path: resolve(import.meta.dirname, '../src/components/button/component.tsx'),
	},
	{
		label: 'barrel (button/index.ts)',
		path: resolve(import.meta.dirname, '../src/components/button/index.ts'),
	},
	{
		label: 'demo file (docs/demos/button.tsx)',
		path: resolve(import.meta.dirname, '../src/docs/demos/button.tsx'),
	},
]

const SERVER_URL = process.env.DOCS_URL ?? 'ws://localhost:3456'
const ITERATIONS = Number(process.env.HMR_ITERATIONS ?? '10')
const TIMEOUT_MS = Number(process.env.HMR_TIMEOUT_MS ?? '5000')

async function connect(): Promise<WebSocket> {
	const ws = new WebSocket(SERVER_URL, 'vite-hmr')

	await new Promise<void>((res, rej) => {
		ws.once('open', () => res())
		ws.once('error', (err) => rej(err))
	})

	return ws
}

function waitForUpdate(ws: WebSocket, signal: AbortSignal): Promise<void> {
	return new Promise((res, rej) => {
		type HmrMessage = { type?: string; updates?: unknown[] }

		const onMessage = (raw: WebSocket.RawData) => {
			let msg: HmrMessage

			try {
				msg = JSON.parse(raw.toString()) as HmrMessage
			} catch {
				return
			}

			if (msg.type === 'update' && Array.isArray(msg.updates) && msg.updates.length > 0) {
				cleanup()
				res()
			}

			if (msg.type === 'full-reload') {
				cleanup()
				res()
			}
		}

		const onAbort = () => {
			cleanup()
			rej(new Error('timeout'))
		}

		const cleanup = () => {
			ws.off('message', onMessage)
			signal.removeEventListener('abort', onAbort)
		}

		ws.on('message', onMessage)
		signal.addEventListener('abort', onAbort, { once: true })
	})
}

async function probe(scenario: Scenario, ws: WebSocket): Promise<number[]> {
	const original = await readFile(scenario.path, 'utf8')

	const samples: number[] = []

	const restore = () => writeFile(scenario.path, original, 'utf8')

	const onSigint = () => {
		void restore().finally(() => process.exit(130))
	}

	process.once('SIGINT', onSigint)

	try {
		for (let i = 0; i < ITERATIONS; i++) {
			const marker = `\n// hmr-probe: ${Date.now()}-${i}\n`

			const ctrl = new AbortController()
			const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

			const updated = waitForUpdate(ws, ctrl.signal)

			const t0 = performance.now()

			await writeFile(scenario.path, original + marker, 'utf8')

			try {
				await updated

				samples.push(performance.now() - t0)
			} catch {
				samples.push(Number.NaN)
			} finally {
				clearTimeout(timer)
			}

			await restore()

			// Small gap so the unwound update doesn't interleave with the next save.
			await new Promise((r) => setTimeout(r, 150))
		}
	} finally {
		await restore()

		process.off('SIGINT', onSigint)
	}

	return samples
}

function quantile(sorted: number[], q: number): number {
	if (sorted.length === 0) return Number.NaN

	const pos = (sorted.length - 1) * q
	const lo = Math.floor(pos)
	const hi = Math.ceil(pos)

	if (lo === hi) return sorted[lo] ?? Number.NaN

	const w = pos - lo

	return (sorted[lo] ?? 0) * (1 - w) + (sorted[hi] ?? 0) * w
}

function summarize(samples: number[]): { median: number; p95: number; ok: number; failed: number } {
	const good = samples.filter((s) => Number.isFinite(s)).sort((a, b) => a - b)

	return {
		median: quantile(good, 0.5),
		p95: quantile(good, 0.95),
		ok: good.length,
		failed: samples.length - good.length,
	}
}

async function main() {
	console.log(`# HMR probe`)
	console.log(`server: ${SERVER_URL}`)
	console.log(`iterations per scenario: ${ITERATIONS}`)
	console.log()

	const ws = await connect()

	try {
		const rows: string[] = []

		for (const scenario of SCENARIOS) {
			console.log(`→ ${scenario.label}`)

			const samples = await probe(scenario, ws)
			const stats = summarize(samples)

			const median = stats.median.toFixed(1)
			const p95 = stats.p95.toFixed(1)

			console.log(`   median ${median} ms · p95 ${p95} ms · ok ${stats.ok}/${ITERATIONS}\n`)

			rows.push(`| ${scenario.label} | ${median} | ${p95} | ${stats.ok}/${ITERATIONS} |`)
		}

		console.log('\n## Markdown\n')
		console.log('| scenario | median (ms) | p95 (ms) | ok |')
		console.log('| --- | --- | --- | --- |')

		for (const row of rows) console.log(row)
	} finally {
		ws.close()
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
