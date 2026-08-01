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

import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const distAssets = path.resolve(import.meta.dirname, '..', '..', 'docs', 'dist', 'assets')

/**
 * Measured 2026-08-01 at 1628 kB total gzip and 46 kB entry gzip, after the
 * vendor-chunk split. Headroom is ~20% on the total and ~40% on the entry, which
 * is where a stray eager import shows up first.
 */
const BUDGET = {
	totalGzipKb: 1950,
	entryGzipKb: 65,
}

type Measurement = { totalGzipKb: number; entryGzipKb: number; entryFile: string }

function measure(): Measurement {
	if (!fs.existsSync(distAssets)) {
		throw new Error(`No build to measure at ${distAssets} — run \`pnpm docs:build\` first.`)
	}

	let totalGzip = 0

	let entryGzip = 0

	let entryFile = ''

	for (const file of fs.readdirSync(distAssets)) {
		const gzip = gzipSync(fs.readFileSync(path.join(distAssets, file))).length

		totalGzip += gzip

		// The entry is the hashed `index-*.js`; the app's own eager chunk, and the
		// one a mis-scoped import inflates.
		if (/^index-[^.]+\.js$/.test(file)) {
			entryGzip = gzip

			entryFile = file
		}
	}

	if (!entryFile) throw new Error('No index-*.js entry chunk found in the build output.')

	return {
		totalGzipKb: Math.round(totalGzip / 1024),
		entryGzipKb: Math.round(entryGzip / 1024),
		entryFile,
	}
}

const measured = measure()

const report = [
	`total gzip:  ${measured.totalGzipKb} kB (budget ${BUDGET.totalGzipKb} kB)`,
	`entry gzip:  ${measured.entryGzipKb} kB (budget ${BUDGET.entryGzipKb} kB, ${measured.entryFile})`,
].join('\n')

if (process.argv.includes('--report')) {
	console.log(report)

	process.exit(0)
}

const failures = [
	measured.totalGzipKb > BUDGET.totalGzipKb &&
		`total gzip ${measured.totalGzipKb} kB exceeds the ${BUDGET.totalGzipKb} kB budget`,
	measured.entryGzipKb > BUDGET.entryGzipKb &&
		`entry gzip ${measured.entryGzipKb} kB exceeds the ${BUDGET.entryGzipKb} kB budget`,
].filter((f): f is string => typeof f === 'string')

if (failures.length > 0) {
	console.error(`Docs bundle over budget:\n${failures.map((f) => `  - ${f}`).join('\n')}\n`)

	console.error(`${report}\n`)

	console.error(
		'Either trim the regression, or raise the ceiling in bundle-budget.ts in the same commit.',
	)

	process.exit(1)
}

console.log(`Docs bundle within budget.\n${report}`)
