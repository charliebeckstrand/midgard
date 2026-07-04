// @vitest-environment node

import { bench, describe } from 'vitest'
import {
	compareSmart,
	compareSortKeys,
	parseNumeric,
	type SortKey,
	toSortKey,
} from '../modules/grid/grid-sorting-utilities'
import { makeShipments } from './fixtures'

// The grid's client sort runs these comparators O(n log n) times per sorted
// column, over regex-heavy numeric parsing and a locale-aware string fallback —
// pure functions with no DOM, benched in a node env (no React noise). Values are
// drawn from the shared Shipment fixture so run-to-run variance reflects the code,
// not the data. The barrel does not re-export the utilities, so import by path
// (as json-tree.bench.ts does).

const shipments10k = makeShipments(10_000)

// Column projections exercise the comparator's distinct leaves: `origin` is the
// locale-aware string fallback (the meaningful stress), `weight` is the cheap
// numeric subtract (the floor), `createdAt` is an ISO string that never parses
// as a number (worst case — full decorate, then string compare).
const strings = (n: number) => shipments10k.slice(0, n).map((r) => r.origin)

const numbers = (n: number) => shipments10k.slice(0, n).map((r) => r.weight)

const dates = (n: number) => shipments10k.slice(0, n).map((r) => r.createdAt)

describe('grid-sort · compareSmart (raw, un-decorated)', () => {
	// The full decorate-and-compare cost per pair: compareSmart re-decorates both
	// arguments on every call (the render path caches keys — see compareSortKeys
	// below — this is the uncached ceiling).
	for (const n of [50, 1_000, 10_000]) {
		const strs = strings(n)

		const nums = numbers(n)

		bench(`${n.toLocaleString()} · string column`, () => {
			strs.slice().sort(compareSmart)
		})

		bench(`${n.toLocaleString()} · numeric column`, () => {
			nums.slice().sort(compareSmart)
		})
	}
})

describe('grid-sort · compareSortKeys (pre-decorated, render path)', () => {
	// What the engine actually runs: values are decorated once (toSortKey), then
	// the keys sort with no reparsing. Split by leaf — all-string keys are
	// localeCompare-bound, all-numeric keys are a plain subtract.
	for (const n of [50, 1_000, 10_000]) {
		const strKeys: SortKey[] = strings(n).map(toSortKey)

		const numKeys: SortKey[] = numbers(n).map(toSortKey)

		bench(`${n.toLocaleString()} · string keys`, () => {
			strKeys.slice().sort(compareSortKeys)
		})

		bench(`${n.toLocaleString()} · numeric keys`, () => {
			numKeys.slice().sort(compareSortKeys)
		})
	}
})

describe('grid-sort · toSortKey (decorate step)', () => {
	// The O(rows) decorate pass run once per sort per column; allocation- and
	// regex-heavy (parseNumeric strips currency/grouping/percent, then a decimal
	// test). Date-shaped strings are the worst case: the regex runs to a failed
	// match every time.
	for (const n of [1_000, 10_000]) {
		const strs = strings(n)

		const nums = numbers(n)

		const dts = dates(n)

		bench(`${n.toLocaleString()} · strings`, () => {
			for (const v of strs) toSortKey(v)
		})

		bench(`${n.toLocaleString()} · numbers`, () => {
			for (const v of nums) toSortKey(v)
		})

		bench(`${n.toLocaleString()} · date strings`, () => {
			for (const v of dts) toSortKey(v)
		})
	}
})

describe('grid-sort · parseNumeric (per-value)', () => {
	// The regex core of the decorate step, over the value shapes it must
	// disambiguate. `(1,234)` and `$1,234.50` take the full strip-and-parse path;
	// `Item 10` and the ISO date take the strip path only to fail the decimal test.
	const samples: unknown[] = [1234.5, '$1,234.50', '(1,234)', '45%', 'Item 10', '2024-01-05']

	bench('mixed value shapes · 6 per iter', () => {
		for (const v of samples) parseNumeric(v)
	})
})
