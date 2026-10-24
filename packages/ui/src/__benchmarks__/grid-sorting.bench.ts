// @vitest-environment node

import { bench, describe } from 'vitest'
import {
	cachedSortOrder,
	compareSmart,
	compareSortKeys,
	computeSortOrder,
	materializeSort,
	naturalCollator,
	type SmartSortField,
	type SortKey,
	sortRowsSmart,
	toSortKey,
} from '../modules/grid/engine/grid-sort/utilities'
import { parseNumeric } from '../utilities'
import { type Shipment, shipmentKey, shipments } from './fixtures'

const collator = naturalCollator('en-US')

const compareValues = (a: unknown, b: unknown) => compareSmart(a, b, collator)

const compareKeys = (a: SortKey, b: SortKey) => compareSortKeys(a, b, collator)

// The grid's client sort runs these comparators O(n log n) times per sorted
// column, over regex-heavy numeric parsing and a locale-aware string fallback:
// pure functions with no DOM, benched in a node env (no React noise). Values are
// drawn from the shared Shipment fixture so run-to-run variance reflects the code,
// not the data. The barrel does not re-export the utilities, so import by path
// (as json-tree.bench.ts does).

const pool10k = shipments(10_000)

// Column projections exercise the comparator's distinct leaves: `origin` is the
// locale-aware string fallback (the meaningful stress), `weight` is the cheap
// numeric subtract (the floor), `createdAt` is an ISO string that never parses
// as a number (worst case, full decorate, then string compare).
const strings = (count: number) => pool10k.slice(0, count).map((row) => row.origin)

const numbers = (count: number) => pool10k.slice(0, count).map((row) => row.weight)

const dates = (count: number) => pool10k.slice(0, count).map((row) => row.createdAt)

describe('grid-sort · compareSmart (raw, un-decorated)', () => {
	// The full decorate-and-compare cost per pair: compareSmart re-decorates both
	// arguments on every call (the render path caches keys, see compareSortKeys
	// below, so this is the uncached ceiling).
	for (const count of [50, 1_000, 10_000]) {
		const stringValues = strings(count)

		const numberValues = numbers(count)

		bench(`${count.toLocaleString()} · string column`, () => {
			stringValues.slice().sort(compareValues)
		})

		bench(`${count.toLocaleString()} · numeric column`, () => {
			numberValues.slice().sort(compareValues)
		})
	}
})

describe('grid-sort · compareSortKeys (pre-decorated, render path)', () => {
	// What the engine actually runs: values are decorated once (toSortKey), then
	// the keys sort with no reparsing. Split by leaf: all-string keys are
	// localeCompare-bound, all-numeric keys are a plain subtract.
	for (const count of [50, 1_000, 10_000]) {
		const stringKeys: SortKey[] = strings(count).map(toSortKey)

		const numberKeys: SortKey[] = numbers(count).map(toSortKey)

		bench(`${count.toLocaleString()} · string keys`, () => {
			stringKeys.slice().sort(compareKeys)
		})

		bench(`${count.toLocaleString()} · numeric keys`, () => {
			numberKeys.slice().sort(compareKeys)
		})
	}
})

describe('grid-sort · toSortKey (decorate step)', () => {
	// The O(rows) decorate pass run once per sort per column; allocation- and
	// regex-heavy (parseNumeric strips currency/grouping/percent, then a decimal
	// test). Date-shaped strings are the worst case: the regex runs to a failed
	// match every time.
	for (const count of [1_000, 10_000]) {
		const stringValues = strings(count)

		const numberValues = numbers(count)

		const dateValues = dates(count)

		bench(`${count.toLocaleString()} · strings`, () => {
			for (const value of stringValues) toSortKey(value)
		})

		bench(`${count.toLocaleString()} · numbers`, () => {
			for (const value of numberValues) toSortKey(value)
		})

		bench(`${count.toLocaleString()} · date strings`, () => {
			for (const value of dateValues) toSortKey(value)
		})
	}
})

describe('grid-sort · parseNumeric (per-value)', () => {
	// The regex core of the decorate step, over the value shapes it must
	// disambiguate. `(1,234)` and `$1,234.50` take the full strip-and-parse path;
	// `Item 10` and the ISO date take the strip path only to fail the decimal test.
	const samples: unknown[] = [1234.5, '$1,234.50', '(1,234)', '45%', 'Item 10', '2024-01-05']

	bench('mixed value shapes · 6 per iter', () => {
		for (const value of samples) parseNumeric(value)
	})
})

// The whole-function sort cost, split into the two halves the render path caches
// apart (see `useGridClientView`): `computeSortOrder` is the costly decode-and-sort that
// a re-sort of unchanged rows by a seen spec reuses; `materializeSort` is the cheap
// projection paid on every flip regardless. The ratio between them is what the
// permutation cache trades on (a flip skips the former and pays only the latter)
// so a regression that inflates `materializeSort` (or shrinks the gap) is a
// regression in the cache's value, caught here before the browser suite feels it.
const stringField: SmartSortField<Shipment> = {
	descending: false,
	accessor: (row) => row.origin,
	sortFn: null,
}

const numberField: SmartSortField<Shipment> = {
	descending: false,
	accessor: (row) => row.weight,
	sortFn: null,
}

describe('grid-sort · sortRowsSmart split (compute vs materialize)', () => {
	for (const count of [10_000, 100_000]) {
		const rows = shipments(count)

		// The permutation of a pre-sorted set, so `materializeSort` is benched over a
		// real order rather than the identity: the exact array the cache hands it.
		const order = computeSortOrder(rows, [stringField], collator)

		bench(`${count.toLocaleString()} · computeSortOrder · string column (the cached half)`, () => {
			computeSortOrder(rows, [stringField], collator)
		})

		bench(`${count.toLocaleString()} · computeSortOrder · numeric column (the cached half)`, () => {
			computeSortOrder(rows, [numberField], collator)
		})

		bench(`${count.toLocaleString()} · materializeSort (paid every flip)`, () => {
			materializeSort(rows, order, shipmentKey)
		})

		bench(
			`${count.toLocaleString()} · sortRowsSmart · string column (compute + materialize)`,
			() => {
				sortRowsSmart(rows, shipmentKey, [stringField], collator)
			},
		)
	}
})

describe('grid-sort · first flip (the other direction of a cached order)', () => {
	for (const count of [10_000, 100_000]) {
		const rows = shipments(count)

		const descending = { ...stringField, descending: true }

		// Each run takes a new column set, so the cache holds only the ascending
		// order and the flip is always a first flip.
		bench(`${count.toLocaleString()} · string column · turn the cached order around`, () => {
			const columns = {}

			cachedSortOrder(rows, columns, 'origin:asc', [stringField], undefined, 'en-US')

			cachedSortOrder(rows, columns, 'origin:desc', [descending], 'origin:asc', 'en-US')
		})

		bench(`${count.toLocaleString()} · string column · sort both directions (no mirror)`, () => {
			const columns = {}

			cachedSortOrder(rows, columns, 'origin:asc', [stringField], undefined, 'en-US')

			cachedSortOrder(rows, columns, 'origin:desc', [descending], undefined, 'en-US')
		})
	}
})
