/**
 * Measurement of the docs build: the gzip size of its assets, and of the
 * chunks that each page loads before it hydrates. `bundle-budget.ts` asserts a
 * ceiling on each.
 */

import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

/** The client directory of the docs build, under `src/docs`. */
const distClient = path.resolve(import.meta.dirname, '..', '..', 'docs', 'dist', 'client')

/** Where the docs build emits its hashed chunks and assets. */
const distAssets = path.join(distClient, 'assets')

/**
 * The page that the build writes with no route content. Its `modulepreload`
 * links are the chunks that each page loads before it hydrates.
 */
const shellPage = path.join(distClient, '__spa-fallback.html')

// A `modulepreload` link to a chunk of the build.
const MODULE_PRELOAD = /<link rel="modulepreload" href="\/assets\/([^"]+)"/g

export type BundleReport = {
	/** The sum of the gzip sizes of the assets of the build. */
	totalGzip: number
	/** The gzip size of the chunks that each page loads before it hydrates. */
	eagerGzip: number
}

/**
 * Measure every asset in the build output.
 *
 * @throws When no build is present. Run `pnpm docs:build` first.
 */
export function readBundle(): BundleReport {
	if (!fs.existsSync(distAssets)) {
		throw new Error(`No build to measure at ${distAssets}. Run \`pnpm docs:build\` first.`)
	}

	const report: BundleReport = { totalGzip: 0, eagerGzip: 0 }

	const eager = new Set(
		Array.from(fs.readFileSync(shellPage, 'utf8').matchAll(MODULE_PRELOAD), ([, file]) => file),
	)

	for (const file of fs.readdirSync(distAssets)) {
		const gzip = gzipSync(fs.readFileSync(path.join(distAssets, file))).length

		report.totalGzip += gzip

		if (eager.has(file)) report.eagerGzip += gzip
	}

	return report
}
