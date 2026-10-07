import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { CLIENT_DIR } from '../../../scripts/docs-server'

// A size budget for the bundle of the docs app. No other gate sees a bundle
// regression. A stray eager import can pull the dependency of a lazy page into
// the entry chunk, and the type-check, the lint, and the tests still pass.
// This file asserts the two numbers that such a regression moves: the total
// gzip size, and the chunks that each page loads before it hydrates.
//
// The ceilings are loose on purpose. They catch a doubling, and they do not
// hold each kilobyte. A change that grows the bundle for a good reason raises
// the ceiling in the same commit. The growth is then a decision that a person
// made, not a change that nobody saw. Each case writes its measurement to the
// log.

/** The directory of the hashed chunks and assets of the build. */
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
]

describe('the bundle of the docs app', () => {
	const report = readBundle()

	for (const { label, budgetKb, of } of BUDGETS) {
		it(`keeps its ${label} in ${budgetKb} kB`, () => {
			const bytes = of(report)

			console.log(`${label}: ${(bytes / 1024).toFixed(1)} kB (budget ${budgetKb} kB)`)

			// The check uses the bytes. A rounded value would let a small change at the
			// ceiling go over it.
			expect(
				bytes,
				`Trim the regression, or raise the ${label} ceiling in bundle-budget.test.ts in the same commit`,
			).toBeLessThanOrEqual(budgetKb * 1024)
		})
	}
})
