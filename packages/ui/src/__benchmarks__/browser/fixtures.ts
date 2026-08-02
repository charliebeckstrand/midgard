/**
 * Deterministic fixture generators for the competitive chart benches. Each
 * helper seeds an LCG; identical parameters produce identical output, so
 * run-to-run variance reflects the library under test, not the data.
 */

import { rng } from '../fixtures'

/** One categorical row: a `label` plus one numeric field per series (`s1`, `s2`, …). */
export type TrendRow = Record<string, string | number>

/**
 * One trend dataset in every contender's natural shape: `rows` for the row
 * readers (ui, AG Charts), `categories` plus per-series `values` for
 * Highcharts' array form. All three views hold the same numbers.
 */
export type TrendData = {
	rows: TrendRow[]
	categories: string[]
	values: number[][]
}

/** The `seriesCount` random walks a trend draws over `count` categories. */
function walks(count: number, seriesCount: number, seed: number): number[][] {
	const next = rng(seed)

	return Array.from({ length: seriesCount }, () => {
		let level = 200 + next() * 600

		return Array.from({ length: count }, () => {
			level = Math.max(10, level + (next() - 0.5) * 80)

			return Math.round(level * 100) / 100
		})
	})
}

const trendCache = new Map<string, TrendData>()

/**
 * One trend in all three contender shapes, memoized per label kind and
 * parameters. The two exported generators differ only in how a category reads,
 * so `label` is the whole difference between them.
 *
 * @remarks Several benches draw the same trend and the ten-thousand-row rungs
 * allocate a row object apiece, so building each one once keeps collection off
 * the clock. Nothing mutates a trend, so the shared object is safe to hand out.
 */
function trend(
	kind: string,
	count: number,
	seriesCount: number,
	seed: number,
	label: (index: number) => string,
): TrendData {
	const key = `${kind}:${count}:${seriesCount}:${seed}`

	const hit = trendCache.get(key)

	if (hit) return hit

	const categories = Array.from({ length: count }, (_, index) => label(index))

	const values = walks(count, seriesCount, seed)

	const rows = categories.map((category, index) => {
		const row: TrendRow = { label: category }

		for (const [series, numbers] of values.entries()) {
			row[`s${series + 1}`] = numbers[index] ?? 0
		}

		return row
	})

	const built: TrendData = { rows, categories, values }

	trendCache.set(key, built)

	return built
}

/**
 * `count` categories × `seriesCount` series of bounded random walks — the
 * plausible dashboard shape, no flat lines and no degenerate domain.
 */
export function makeTrend(count: number, seriesCount: number, seed = 1): TrendData {
	return trend('plain', count, seriesCount, seed, (i) => `P${String(i + 1).padStart(5, '0')}`)
}

/** The first day the dated fixture walks from; every row is one day past the last. */
const DATE_ORIGIN = Date.UTC(2020, 0, 1)

const DAY_MS = 86_400_000

/**
 * {@link makeTrend} with ISO-date categories in place of the opaque `P00001`
 * labels — the shape a time-series dashboard actually holds, and the one that
 * puts every contender's date handling on the clock: the ui module's band axis
 * probes whether all categories parse as dates (and formats them through
 * `Intl` when they do), where a non-date axis exits on its first value. Same
 * values, same seed, so it differs from the plain trend in labels alone.
 */
export function makeDatedTrend(count: number, seriesCount: number, seed = 1): TrendData {
	return trend('dated', count, seriesCount, seed, (i) =>
		new Date(DATE_ORIGIN + i * DAY_MS).toISOString().slice(0, 10),
	)
}

/** One scatter point row; `pairs` mirrors it in Highcharts' `[x, y]` form. */
export type PointRow = { x: number; y: number }

/** One scatter dataset: `rows` for the row readers, `pairs` for Highcharts. */
export type PointData = {
	rows: PointRow[]
	pairs: [number, number][]
}

/** `count` points scattered over a correlated cloud. */
export function makePoints(count: number, seed = 1): PointData {
	const next = rng(seed)

	const pairs = Array.from({ length: count }, (): [number, number] => {
		const x = Math.round(next() * 10_000) / 10

		const y = Math.round((x * 0.6 + next() * 400) * 10) / 10

		return [x, y]
	})

	const rows = pairs.map(([x, y]) => ({ x, y }))

	return { rows, pairs }
}
