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

import { type BundleReport, readBundle } from './bundle-report'

/**
 * Measured 2026-08-13 at 1960 kB total gzip and 46 kB entry gzip, after the
 * county atlas joined the demo assets — 250 kB gzip of the total on its own, for
 * the map module's county drill. Headroom is ~15% on the total and ~30% on the
 * entry, which is where a stray eager import shows up first.
 *
 * The entry did not move for that atlas, which is the reading these two numbers
 * exist to separate: the demos fetch their atlases as static assets, so one
 * joining the build grows what is on disk and nothing that loads before a reader
 * opens its tab.
 *
 * On 2026-10-02 the entry was 64 kB and the ceiling was 65 kB. A change of a few
 * hundred bytes then failed the gate. The entry ceiling is now 69 kB. A stray
 * eager import adds some kB, so it still goes past the ceiling.
 *
 * On 2026-10-03 the docs moved to React Router with a prerendered page for each
 * demo. The app has no single entry chunk now. The budget sums the chunks that
 * each page preloads before it hydrates: the router, React, the vendors that
 * the chrome uses, and the chrome. They were 268 kB, and 218 kB on main before
 * the move. The ceiling is 290 kB, with the same headroom of about 20 kB.
 *
 * On 2026-10-04 the docs dropped their Shiki alias (#1812), and `CodeBlock`
 * moved to a worker that can load each bundled grammar and theme. The total
 * went from 2038 kB to 3578 kB. The worker brings 242 grammar chunks (1321 kB)
 * and 65 theme chunks (238 kB), and each is a lazy chunk. A page loads none of
 * them before it hydrates. A block loads the worker entry (59 kB), one grammar,
 * and one theme. The alias had cut the docs to three grammars and one theme,
 * and the `CodeBlock` of an app already had the full set. The eager sum did not
 * move: 257.4 kB on main and after. The total ceiling is 3800 kB, with the same
 * headroom of about 220 kB.
 */
const BUDGETS = [
	{ label: 'total gzip', budgetKb: 3800, of: (report: BundleReport) => report.totalGzip },
	{ label: 'eager gzip', budgetKb: 290, of: (report: BundleReport) => report.eagerGzip },
] as const

const report = readBundle()

const measurements = BUDGETS.map(({ label, budgetKb, of }) => {
	const bytes = of(report)

	if (bytes === undefined) throw new Error(`No ${label} measurement in the build output.`)

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
