/**
 * Size budget for the docs bundle, run in CI after `docs:build`.
 *
 * Nothing else in the gate notices a bundle regression: a stray eager import
 * that pulls a lazy demo's dependency into the entry chunk type-checks, lints,
 * and tests clean. This asserts the two numbers such a regression moves — total
 * gzip, and the eager entry chunk — and fails with the delta when either passes
 * its ceiling.
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

import { type BundleReport, readBundle, stableName } from './bundle-report'

/** The app's eager entry chunk, named as `readBundle` reports it. */
const ENTRY_CHUNK = stableName('index-00000000.js')

/**
 * Measured 2026-08-08 at 1691 kB total gzip and 46 kB entry gzip, after the
 * world atlas joined the demo assets. Headroom is ~13% on the total and ~30% on
 * the entry, which is where a stray eager import shows up first.
 */
const BUDGETS = [
	{ label: 'total gzip', budgetKb: 1950, of: (report: BundleReport) => report.totalGzip },
	{
		label: 'entry gzip',
		budgetKb: 65,
		// The app's own eager chunk — `stableName` has already stripped the content
		// hash, so this is the same name `vite-metrics.ts` reports and compares.
		of: (report: BundleReport) => report.chunks.find((c) => c.name === ENTRY_CHUNK)?.gzip,
	},
] as const

const report = readBundle()

const measurements = BUDGETS.map(({ label, budgetKb, of }) => {
	const bytes = of(report)

	if (bytes === undefined) throw new Error(`No ${label} measurement in the build output.`)

	return { label, budgetKb, valueKb: Math.round(bytes / 1024) }
})

const summary = measurements
	.map(({ label, valueKb, budgetKb }) => `${label}: ${valueKb} kB (budget ${budgetKb} kB)`)
	.join('\n')

if (process.argv.includes('--report')) {
	console.log(summary)

	process.exit(0)
}

const over = measurements.filter(({ valueKb, budgetKb }) => valueKb > budgetKb)

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
