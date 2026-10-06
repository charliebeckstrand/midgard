/**
 * Size budget for the bundle of the docs app, run in CI after `docs:build`.
 *
 * Nothing else in the gate notices a bundle regression: a stray eager import
 * that pulls a lazy page's dependency into the entry chunk type-checks, lints,
 * and tests clean. This asserts the two numbers such a regression moves — total
 * gzip, and the chunks each page loads before it hydrates — and fails with the
 * delta when either passes its ceiling.
 *
 * Ceilings are deliberately loose. They are a tripwire for a doubling, not a
 * ratchet on every kilobyte; a change that legitimately grows the bundle raises
 * them in the same commit, which is the point — the growth becomes a decision
 * someone made rather than one nobody saw.
 *
 * ```sh
 * pnpm bundle:budget            # assert (expects an existing build)
 * pnpm bundle:budget --report   # print the measurements and exit 0
 * ```
 */

import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { CLIENT_DIR } from '../../../scripts/docs-server'

/** Where the docs build emits its hashed chunks and assets. */
const ASSETS_DIR = path.join(CLIENT_DIR, 'assets')

/**
 * The page that the build writes with no route content. Its `modulepreload`
 * links are the chunks that each page loads before it hydrates.
 */
const SHELL_PAGE = path.join(CLIENT_DIR, '__spa-fallback.html')

// A `modulepreload` link to a chunk of the build.
const MODULE_PRELOAD = /<link rel="modulepreload" href="\/assets\/([^"]+)"/g

type BundleReport = {
	/** The sum of the gzip sizes of the assets of the build. */
	totalGzip: number
	/** The gzip size of the chunks that each page loads before it hydrates. */
	eagerGzip: number
}

/** Measures each asset in the build output. */
function readBundle(): BundleReport {
	if (!fs.existsSync(ASSETS_DIR)) {
		throw new Error(`No build to measure at ${ASSETS_DIR}. Run \`pnpm docs:build\` first.`)
	}

	const report: BundleReport = { totalGzip: 0, eagerGzip: 0 }

	const eager = new Set(
		Array.from(fs.readFileSync(SHELL_PAGE, 'utf8').matchAll(MODULE_PRELOAD), ([, file]) => file),
	)

	for (const file of fs.readdirSync(ASSETS_DIR)) {
		const gzip = gzipSync(fs.readFileSync(path.join(ASSETS_DIR, file))).length

		report.totalGzip += gzip

		if (eager.has(file)) report.eagerGzip += gzip
	}

	return report
}

/**
 * The total holds lazy chunks that no page loads before it hydrates: the
 * grammars and the themes of the `CodeBlock` worker, the code of each example,
 * the API data, and the files that pdf.js loads at run time. Most of its
 * growth is such files, and it does not move the eager sum.
 *
 * The eager sum is the chunks that each page preloads: the router, React, the
 * vendors that the shell uses, and the shell. A stray eager import shows up
 * there first.
 */
const BUDGETS = [
	{ label: 'total gzip', budgetKb: 5200, of: (report: BundleReport) => report.totalGzip },
	{ label: 'eager gzip', budgetKb: 290, of: (report: BundleReport) => report.eagerGzip },
] as const

const report = readBundle()

const measurements = BUDGETS.map(({ label, budgetKb, of }) => {
	const bytes = of(report)

	// The check uses the bytes. A rounded value would let a small change at the
	// ceiling go over it.
	return { label, budgetKb, bytes, valueKb: (bytes / 1024).toFixed(1) }
})

const summary = measurements
	.map(({ label, valueKb, budgetKb }) => `${label}: ${valueKb} kB (budget ${budgetKb} kB)`)
	.join('\n')

if (process.argv.includes('--report')) {
	console.log(summary)

	process.exit(0)
}

const over = measurements.filter(({ bytes, budgetKb }) => bytes > budgetKb * 1024)

if (over.length > 0) {
	const lines = over.map(
		(m) => `  - ${m.label} ${m.valueKb} kB exceeds the ${m.budgetKb} kB budget`,
	)

	console.error(`Docs bundle over budget:\n${lines.join('\n')}\n`)

	console.error(`${summary}\n`)

	console.error(
		'Either trim the regression, or raise the ceiling in bundle-budget.ts in the same commit.',
	)

	process.exit(1)
}

console.log(`Docs bundle within budget.\n${summary}`)
