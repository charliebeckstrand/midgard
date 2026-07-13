/**
 * Whole-process metrics for the docs app that vitest bench can't express:
 * prod build wall time, per-chunk bundle sizes, dev cold start, and the
 * ts-morph extraction cost as the dev server actually pays it (first and
 * re-invalidated reads of `virtual:api-reference-manifest`).
 *
 * ```sh
 * pnpm bench:docs:vite                     # build + dev, print a report
 * pnpm bench:docs:vite -- --runs 3         # repeat for variance
 * pnpm bench:docs:vite -- --json base.json # save a baseline
 * pnpm bench:docs:vite -- --compare base.json
 * pnpm bench:docs:vite -- --dev            # dev-only (skip the build)
 * pnpm bench:docs:vite -- --build          # build-only
 * ```
 */

import { type ChildProcess, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const pkgRoot = path.resolve(import.meta.dirname, '..', '..', '..')

const viteBin = path.join(pkgRoot, 'node_modules', '.bin', 'vite')

const distAssets = path.join(pkgRoot, 'src', 'docs', 'dist', 'assets')

// A source file whose edit invalidates the api-reference family; touched (mtime
// only, content untouched) to measure HMR re-extraction.
const invalidationTarget = path.join(pkgRoot, 'src', 'components', 'button', 'button.tsx')

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

type Cli = { build: boolean; dev: boolean; runs: number; json?: string; compare?: string }

function parseArgs(rawArgv: string[]): Cli {
	const cli: Cli = { build: false, dev: false, runs: 1 }

	// pnpm forwards a literal `--` separator; drop it before parsing.
	const argv = rawArgv.filter((arg) => arg !== '--')

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]

		if (arg === '--build') cli.build = true
		else if (arg === '--dev') cli.dev = true
		else if (arg === '--runs') cli.runs = Math.max(1, Number(argv[++i]) || 1)
		else if (arg === '--json') cli.json = argv[++i]
		else if (arg === '--compare') cli.compare = argv[++i]
		else throw new Error(`unknown argument: ${arg}`)
	}

	// No mode flag: measure everything.
	if (!cli.build && !cli.dev) cli.build = cli.dev = true

	return cli
}

// ---------------------------------------------------------------------------
// Prod build: wall time + bundle report
// ---------------------------------------------------------------------------

type ChunkEntry = { name: string; raw: number; gzip: number }

type BundleReport = {
	files: number
	totalRaw: number
	totalGzip: number
	jsRaw: number
	jsGzip: number
	cssRaw: number
	cssGzip: number
	chunks: ChunkEntry[]
}

type Metrics = {
	buildMs?: number[]
	bundle?: BundleReport
	dev?: DevMetrics[]
}

/** Strip the content hash so chunk names stay comparable across builds. */
function stableName(file: string): string {
	return file.replace(/-[\w-]{8,12}(?=\.[a-z]+$)/, '')
}

function runBuild(): Promise<number> {
	return new Promise((resolve, reject) => {
		const t0 = performance.now()

		const child = spawn(viteBin, ['build', '--config', 'vite.docs.config.ts'], {
			cwd: pkgRoot,
			stdio: ['ignore', 'ignore', 'inherit'],
		})

		child.on('error', reject)

		child.on('exit', (code) => {
			if (code !== 0) return reject(new Error(`vite build exited with ${code}`))

			resolve(performance.now() - t0)
		})
	})
}

function readBundle(): BundleReport {
	const report: BundleReport = {
		files: 0,
		totalRaw: 0,
		totalGzip: 0,
		jsRaw: 0,
		jsGzip: 0,
		cssRaw: 0,
		cssGzip: 0,
		chunks: [],
	}

	// Different chunks can share a hash-stripped name (a component chunk and a
	// demo chunk with the same basename); aggregate so `--compare` matches
	// stably instead of mislabeling the duplicate as added/removed.
	const byName = new Map<string, ChunkEntry>()

	for (const file of fs.readdirSync(distAssets)) {
		const content = fs.readFileSync(path.join(distAssets, file))

		const raw = content.length

		const gzip = gzipSync(content).length

		report.files++

		report.totalRaw += raw

		report.totalGzip += gzip

		if (/\.(js|mjs)$/.test(file)) {
			report.jsRaw += raw

			report.jsGzip += gzip
		} else if (file.endsWith('.css')) {
			report.cssRaw += raw

			report.cssGzip += gzip
		}

		const name = stableName(file)

		const entry = byName.get(name)

		if (entry) {
			entry.raw += raw

			entry.gzip += gzip
		} else {
			byName.set(name, { name, raw, gzip })
		}
	}

	report.chunks = [...byName.values()].sort((a, b) => b.raw - a.raw)

	return report
}

// ---------------------------------------------------------------------------
// Dev cold start + extraction latency
// ---------------------------------------------------------------------------

type DevMetrics = {
	/** Spawn → the server printing its Local URL. */
	readyMs: number
	/** First `/main.tsx` transform completing (rides the configured warmup). */
	entryMs: number
	/** First `virtual:api-reference-manifest` read: full extraction cold, a disk-cache replay warm. */
	apiManifestMs: number
	/**
	 * Manifest re-read after the first component-source touch. On a disk-served
	 * start this pays the extractor's one-time warming pass (a full extraction);
	 * on a cold start the checker is already warm and it runs per-barrel.
	 */
	apiReextractMs: number
	/** Manifest re-read after a second touch — always the per-barrel steady state. */
	apiReextractWarmMs: number
}

/** The resolved (`\0`-prefixed) manifest id as Vite serves it over HTTP. */
const MANIFEST_PATH = '/@id/__x00__virtual:api-reference-manifest'

function killDevServer(child: ChildProcess): void {
	if (!child.killed) child.kill('SIGTERM')
}

async function timedFetch(url: string): Promise<number> {
	// The dev server closes idle keep-alive sockets while it settles, which
	// surfaces as ECONNRESET on a reused connection; retry the transient
	// failures and time only the successful attempt.
	for (let attempt = 0; ; attempt++) {
		const t0 = performance.now()

		try {
			const res = await fetch(url)

			await res.arrayBuffer()

			if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)

			return performance.now() - t0
		} catch (error) {
			if (
				attempt >= 2 ||
				error instanceof Error === false ||
				!error.message.includes('fetch failed')
			)
				throw error

			await new Promise((r) => setTimeout(r, 250))
		}
	}
}

function waitForReady(child: ChildProcess, t0: number): Promise<{ readyMs: number; url: string }> {
	return new Promise((resolve, reject) => {
		let buffer = ''

		child.stdout?.on('data', (data: Buffer) => {
			buffer += data.toString()

			// biome-ignore lint/suspicious/noControlCharactersInRegex: strips ANSI color codes from vite's banner
			const clean = buffer.replace(/\[[0-9;]*m/g, '')

			const match = clean.match(/Local:\s+(http:\/\/\S+)/)

			if (match?.[1]) resolve({ readyMs: performance.now() - t0, url: match[1].replace(/\/$/, '') })
		})

		child.on('error', reject)

		child.on('exit', (code) => reject(new Error(`vite dev exited early with ${code}`)))
	})
}

async function runDev(): Promise<DevMetrics> {
	const t0 = performance.now()

	const child = spawn(viteBin, ['--config', 'vite.docs.config.ts', '--port', '0'], {
		cwd: pkgRoot,
		stdio: ['ignore', 'pipe', 'inherit'],
	})

	try {
		const { readyMs, url } = await waitForReady(child, t0)

		const entryMs = await timedFetch(`${url}/main.tsx`)

		const apiManifestMs = await timedFetch(`${url}${MANIFEST_PATH}`)

		// Touch (mtime-only) a component source so `shouldInvalidate` clears the
		// api-reference family, then re-read the manifest: the re-extraction cost
		// the user pays after a component edit. Twice — the first edit after a
		// disk-served start pays the extractor's warming pass, the second is the
		// per-barrel steady state.
		const touchAndRefetch = async () => {
			const now = new Date()

			fs.utimesSync(invalidationTarget, now, now)

			await new Promise((r) => setTimeout(r, 500))

			return timedFetch(`${url}${MANIFEST_PATH}`)
		}

		const apiReextractMs = await touchAndRefetch()

		const apiReextractWarmMs = await touchAndRefetch()

		return { readyMs, entryMs, apiManifestMs, apiReextractMs, apiReextractWarmMs }
	} finally {
		killDevServer(child)
	}
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b)

	const mid = Math.floor(sorted.length / 2)

	return sorted.length % 2
		? (sorted[mid] as number)
		: ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
}

function kb(bytes: number): string {
	return `${(bytes / 1024).toFixed(1)} kB`
}

function ms(value: number): string {
	return `${Math.round(value)} ms`
}

function printReport(metrics: Metrics): void {
	if (metrics.buildMs) {
		console.log(
			`\nprod build: ${ms(median(metrics.buildMs))} median (${metrics.buildMs.map(ms).join(', ')})`,
		)
	}

	if (metrics.bundle) {
		const b = metrics.bundle

		console.log(
			`bundle: ${b.files} files, ${kb(b.totalRaw)} raw / ${kb(b.totalGzip)} gzip` +
				` (js ${kb(b.jsRaw)}/${kb(b.jsGzip)}, css ${kb(b.cssRaw)}/${kb(b.cssGzip)})`,
		)

		console.log('largest chunks:')

		for (const chunk of b.chunks.slice(0, 12)) {
			console.log(
				`  ${kb(chunk.raw).padStart(10)} raw ${kb(chunk.gzip).padStart(10)} gzip  ${chunk.name}`,
			)
		}
	}

	if (metrics.dev) {
		const pick = (key: keyof DevMetrics) => median(metrics.dev?.map((d) => d[key]) ?? [])

		console.log(
			`\ndev (median of ${metrics.dev.length}): ready ${ms(pick('readyMs'))},` +
				` entry ${ms(pick('entryMs'))}, api manifest ${ms(pick('apiManifestMs'))},` +
				` re-extract ${ms(pick('apiReextractMs'))} first / ${ms(pick('apiReextractWarmMs'))} steady`,
		)
	}
}

function delta(label: string, before: number, after: number, fmt: (n: number) => string): void {
	const pct = before === 0 ? 0 : ((after - before) / before) * 100

	console.log(
		`  ${label}: ${fmt(before)} → ${fmt(after)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`,
	)
}

function compareBundles(baseline: BundleReport, current: BundleReport): void {
	delta('bundle gzip', baseline.totalGzip, current.totalGzip, kb)

	const before = new Map(baseline.chunks.map((c) => [c.name, c]))

	for (const chunk of current.chunks) {
		const prior = before.get(chunk.name)

		if (!prior) console.log(`  new chunk: ${chunk.name} (${kb(chunk.raw)})`)
		else if (Math.abs(chunk.raw - prior.raw) > 1024) delta(chunk.name, prior.raw, chunk.raw, kb)

		before.delete(chunk.name)
	}

	for (const name of before.keys()) console.log(`  removed chunk: ${name}`)
}

function compareDev(baseline: DevMetrics[], current: DevMetrics[]): void {
	for (const key of [
		'readyMs',
		'entryMs',
		'apiManifestMs',
		'apiReextractMs',
		'apiReextractWarmMs',
	] as const) {
		delta(key, median(baseline.map((d) => d[key])), median(current.map((d) => d[key])), ms)
	}
}

function printComparison(current: Metrics, baselinePath: string): void {
	const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8')) as Metrics

	console.log(`\nvs baseline ${baselinePath}:`)

	if (baseline.buildMs && current.buildMs) {
		delta('build', median(baseline.buildMs), median(current.buildMs), ms)
	}

	if (baseline.bundle && current.bundle) compareBundles(baseline.bundle, current.bundle)

	if (baseline.dev?.length && current.dev?.length) compareDev(baseline.dev, current.dev)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const cli = parseArgs(process.argv.slice(2))

	const metrics: Metrics = {}

	if (cli.build) {
		metrics.buildMs = []

		for (let i = 0; i < cli.runs; i++) metrics.buildMs.push(await runBuild())

		metrics.bundle = readBundle()
	}

	if (cli.dev) {
		metrics.dev = []

		for (let i = 0; i < cli.runs; i++) metrics.dev.push(await runDev())
	}

	printReport(metrics)

	if (cli.compare) printComparison(metrics, cli.compare)

	if (cli.json) {
		fs.writeFileSync(cli.json, `${JSON.stringify(metrics, null, '\t')}\n`)

		console.log(`\nwrote ${cli.json}`)
	}
}

main().then(
	// A dev-server descendant (esbuild service) can inherit the stdout pipe and
	// hold the event loop open after SIGTERM; exit explicitly once reporting is
	// done.
	() => process.exit(0),
	(error) => {
		console.error(error)

		process.exit(1)
	},
)
