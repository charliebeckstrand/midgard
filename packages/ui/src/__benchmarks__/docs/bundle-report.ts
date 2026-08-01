/**
 * Measurement of a built docs bundle: per-chunk raw and gzip sizes plus the
 * js/css/total rollups.
 *
 * Shared so the two things that read the bundle — `vite-metrics.ts`, which
 * reports and compares it, and `bundle-budget.ts`, which asserts a ceiling on
 * it — agree by construction. They previously derived the assets directory,
 * the hash-stripping rule, and the gzip walk separately, which is exactly the
 * kind of pair that drifts the moment chunk naming changes.
 */

import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const pkgRoot = path.resolve(import.meta.dirname, '..', '..', '..')

/** Where the docs build emits its hashed chunks and assets. */
export const distAssets = path.join(pkgRoot, 'src', 'docs', 'dist', 'assets')

export type ChunkEntry = { name: string; raw: number; gzip: number }

export type BundleReport = {
	files: number
	totalRaw: number
	totalGzip: number
	jsRaw: number
	jsGzip: number
	cssRaw: number
	cssGzip: number
	chunks: ChunkEntry[]
}

/** Strip the content hash so chunk names stay comparable across builds. */
export function stableName(file: string): string {
	return file.replace(/-[\w-]{8,12}(?=\.[a-z]+$)/, '')
}

/**
 * Measure every asset in the build output.
 *
 * @throws When no build is present — the caller is expected to run
 *   `pnpm docs:build` first.
 */
export function readBundle(): BundleReport {
	if (!fs.existsSync(distAssets)) {
		throw new Error(`No build to measure at ${distAssets} — run \`pnpm docs:build\` first.`)
	}

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
