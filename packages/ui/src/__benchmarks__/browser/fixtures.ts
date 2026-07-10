/**
 * Deterministic fixture generators for the competitive chart benches. Each
 * helper seeds an LCG; identical parameters produce identical output, so
 * run-to-run variance reflects the library under test, not the data.
 */

/** The shared LCG behind every generator here and in `map-fixtures.ts`. */
export function rng(seed = 1) {
	let state = seed >>> 0

	return () => {
		state = (state * 1664525 + 1013904223) >>> 0

		return state / 0x100000000
	}
}

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

/**
 * `count` categories × `seriesCount` series of bounded random walks — the
 * plausible dashboard shape, no flat lines and no degenerate domain.
 */
export function makeTrend(count: number, seriesCount: number, seed = 1): TrendData {
	const next = rng(seed)

	const categories = Array.from({ length: count }, (_, i) => `P${String(i + 1).padStart(5, '0')}`)

	const values = Array.from({ length: seriesCount }, () => {
		let level = 200 + next() * 600

		return categories.map(() => {
			level = Math.max(10, level + (next() - 0.5) * 80)

			return Math.round(level * 100) / 100
		})
	})

	const rows = categories.map((label, i) => {
		const row: TrendRow = { label }

		for (const [s, series] of values.entries()) {
			row[`s${s + 1}`] = series[i] ?? 0
		}

		return row
	})

	return { rows, categories, values }
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
