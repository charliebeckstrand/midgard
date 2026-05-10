/**
 * Cold prod-load probe via Lighthouse CLI.
 *
 * Runs Lighthouse against five representative routes of the built docs SPA
 * under Fast-3G + 4× CPU throttling. Emits a markdown summary suitable for
 * pasting into `perf.md`.
 *
 * Prerequisites:
 *   pnpm docs:build
 *   pnpm docs:preview      # in another terminal (or set DOCS_URL)
 *   npx lighthouse --version   # ensure Lighthouse is available
 *
 * Routes are hash-routed; Lighthouse follows the URL fragment via Chrome.
 */

import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

type Route = { id: string; url: string }

const BASE = process.env.DOCS_URL ?? 'http://localhost:3456'

const ROUTES: Route[] = [
	{ id: 'home', url: `${BASE}/` },
	{ id: 'button', url: `${BASE}/#button` },
	{ id: 'dialog', url: `${BASE}/#dialog` },
	{ id: 'data-table', url: `${BASE}/#data-table` },
	{ id: 'query-builder', url: `${BASE}/#query-builder` },
]

type LhAudit = { numericValue?: number; score?: number | null }

type LhJson = {
	categories?: { performance?: { score?: number | null } }
	audits?: {
		'first-contentful-paint'?: LhAudit
		'largest-contentful-paint'?: LhAudit
		'total-blocking-time'?: LhAudit
		interactive?: LhAudit
	}
}

async function lighthouse(url: string): Promise<LhJson> {
	const dir = await mkdtemp(join(tmpdir(), 'lh-'))
	const out = join(dir, 'report.json')

	const args = [
		'-y',
		'lighthouse',
		url,
		'--quiet',
		'--chrome-flags=--headless=new --no-sandbox',
		'--output=json',
		`--output-path=${out}`,
		'--only-categories=performance',
		'--throttling-method=simulate',
		'--throttling.rttMs=150',
		'--throttling.throughputKbps=1638.4',
		'--throttling.cpuSlowdownMultiplier=4',
		'--screenEmulation.mobile=false',
		'--screenEmulation.width=1280',
		'--screenEmulation.height=800',
	]

	const code = await new Promise<number>((res, rej) => {
		const child = spawn('npx', args, { stdio: 'inherit' })
		child.on('exit', (c) => res(c ?? 1))
		child.on('error', rej)
	})

	if (code !== 0) {
		await rm(dir, { recursive: true, force: true })
		throw new Error(`lighthouse exited ${code} for ${url}`)
	}

	const raw = await readFile(out, 'utf8')

	await rm(dir, { recursive: true, force: true })

	return JSON.parse(raw) as LhJson
}

function ms(audit: LhAudit | undefined): string {
	const v = audit?.numericValue

	if (v == null || !Number.isFinite(v)) return '—'

	return `${Math.round(v)} ms`
}

function score(s?: number | null): string {
	if (s == null) return '—'

	return Math.round(s * 100).toString()
}

async function main() {
	console.log(`# Lighthouse probe`)
	console.log(`base: ${BASE}\n`)

	const rows: string[] = []

	for (const route of ROUTES) {
		console.log(`→ ${route.url}`)

		try {
			const json = await lighthouse(route.url)

			const fcp = ms(json.audits?.['first-contentful-paint'])
			const lcp = ms(json.audits?.['largest-contentful-paint'])
			const tbt = ms(json.audits?.['total-blocking-time'])
			const tti = ms(json.audits?.interactive)
			const perf = score(json.categories?.performance?.score)

			console.log(`   FCP ${fcp} · LCP ${lcp} · TBT ${tbt} · TTI ${tti} · Perf ${perf}\n`)

			rows.push(`| ${route.id} | ${fcp} | ${lcp} | ${tbt} | ${tti} | ${perf} |`)
		} catch (err) {
			console.error(err)
			rows.push(`| ${route.id} | error | error | error | error | error |`)
		}
	}

	console.log('\n## Markdown\n')
	console.log('| route | FCP | LCP | TBT | TTI | Perf score |')
	console.log('| --- | --- | --- | --- | --- | --- |')

	for (const row of rows) console.log(row)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
