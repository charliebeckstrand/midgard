// @vitest-environment node

import { bench, describe } from 'vitest'
import type { GridColumn } from '../modules/grid'
import {
	aggregateColumn,
	formatAggregate,
	hasAggregation,
} from '../modules/grid/engine/grid-aggregate'
import { columnAccessor } from '../modules/grid/engine/grid-column/accessor'
import {
	buildGroupSpans,
	collapsedHiddenIds,
	groupByColumn,
	groupedColumnOrder,
} from '../modules/grid/engine/grid-group/compute'
import { cellValue } from '../modules/grid/engine/grid-row/cell'
import type { GridColumnGroup } from '../modules/grid/grid-group-types'
import { SHIPMENT_FIELDS, type Shipment, shipments } from './fixtures'

/**
 * Grouping and aggregation — the grid compute `grid-compute.bench.ts` leaves
 * out, and the only part of the render hot path that is quadratic in the wrong
 * hands. A grouped body computes one aggregate per aggregated column per group,
 * each a full pass over that group's rows through the regex-heavy
 * `parseNumeric` the sort bench already charges for; a twenty-group body over
 * eight aggregated columns pays that a hundred and sixty times per render.
 *
 * The column-group compute alongside it is small but unconditional: `groupByColumn`,
 * `groupedColumnOrder`, `collapsedHiddenIds`, and `buildGroupSpans` all run on
 * every render of every grouped grid, however few rows it holds.
 *
 * Node env, no DOM. Import each utility by path; the grid barrel does not
 * re-export them.
 */

/** The reducers a grouped grid runs, plus the custom-function escape hatch. */
const AGG_FUNCS = ['sum', 'avg', 'min', 'max', 'count'] as const

const numeric = (aggFunc: (typeof AGG_FUNCS)[number]): GridColumn<Shipment> => ({
	id: 'weight',
	title: 'Weight',
	aggFunc,
})

/** The eight shipment columns, undecorated — the set every scenario here starts from. */
const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({ id, title }))

/** The same eight, each reducing through `aggFunc`. */
const aggregating = (aggFunc: (typeof AGG_FUNCS)[number]): GridColumn<Shipment>[] =>
	COLUMNS.map((column) => ({ ...column, aggFunc }))

describe('grid-aggregate · aggregateColumn (per group, per column, per render)', () => {
	// The decode-and-reduce pass. `count` short-circuits to `rows.length` and is
	// the floor; every numeric reducer walks the rows through `parseNumeric`
	// first, so they should all land together and well above it. The gap between
	// `count` and the rest is what parsing costs — and it is paid again for every
	// aggregated column, since each decodes its own values.
	for (const rows of [100, 1_000, 10_000]) {
		const data = shipments(rows)

		for (const aggFunc of AGG_FUNCS) {
			const column = numeric(aggFunc)

			bench(`${rows.toLocaleString()} rows · ${aggFunc}`, () => {
				aggregateColumn(column, data)
			})
		}
	}
})

describe('grid-aggregate · a grouped body (20 groups × 8 columns)', () => {
	// What a grouped render actually costs: every aggregated column reduced over
	// every group's rows. Against one `sum` over the same total rows, the gap is
	// the per-group, per-column repetition — the shape a shared decode pass would
	// collapse.
	const total = 10_000

	const groups = 20

	const data = shipments(total)

	const slices = Array.from({ length: groups }, (_, index) =>
		data.slice((index * total) / groups, ((index + 1) * total) / groups),
	)

	const counting = aggregating('count')

	const summing = aggregating('sum')

	bench('one sum over 10,000 rows (the floor)', () => {
		aggregateColumn(numeric('sum'), data)
	})

	bench('20 groups × 8 count columns', () => {
		for (const slice of slices) for (const column of counting) aggregateColumn(column, slice)
	})

	bench('20 groups × 8 sum columns', () => {
		for (const slice of slices) for (const column of summing) aggregateColumn(column, slice)
	})
})

describe('grid-aggregate · gates and formatting', () => {
	const aggregated: GridColumn<Shipment>[] = COLUMNS.map((column, index) =>
		index === COLUMNS.length - 1 ? { ...column, aggFunc: 'sum' } : column,
	)

	// The one gate for the aggregate rows, run per render. `some` exits on the
	// first hit, so a grid whose *last* column aggregates is the worst case.
	bench('hasAggregation · 8 cols · none', () => {
		hasAggregation(COLUMNS)
	})

	bench('hasAggregation · 8 cols · last aggregates', () => {
		hasAggregation(aggregated)
	})

	// One `Intl`-backed format per aggregate cell.
	bench('formatAggregate · integer', () => {
		formatAggregate(1_234_567)
	})

	bench('formatAggregate · fraction', () => {
		formatAggregate(1_234.5678)
	})
})

describe('grid-row · cellValue (per cell, per render)', () => {
	// The value resolution behind every sorted, filtered, exported, and
	// aggregated cell. `cellValue` re-derives the accessor closure on every call;
	// hoisting it out — as the aggregate reducers do through `columnAccessor` —
	// is the difference these two bars price, multiplied by rows × columns.
	const row = shipments(100)[0] as Shipment

	const field: GridColumn<Shipment> = { id: 'weight', title: 'Weight' }

	const explicit: GridColumn<Shipment> = { id: 'w', title: 'Weight', value: (r) => r.weight }

	const hoisted = columnAccessor(field)

	bench('field column · cellValue (accessor rebuilt per call)', () => {
		cellValue(field, row)
	})

	bench('field column · hoisted accessor', () => {
		hoisted(row)
	})

	bench('value column · cellValue', () => {
		cellValue(explicit, row)
	})

	// The whole visible window of a virtualized grid: ~20 rows × 8 columns, the
	// per-render cell resolution a scroll frame repeats.
	const window = shipments(20)

	bench('20 rows × 8 cols · one window', () => {
		for (const windowRow of window) for (const column of COLUMNS) cellValue(column, windowRow)
	})
})

describe('grid-group · column-group compute (every render of a grouped grid)', () => {
	// Small passes, but unconditional: a grouped grid runs all four on every
	// render regardless of row count, so they are pure per-render overhead the
	// row-count benches above can never surface.
	for (const count of [8, 40, 200]) {
		const ids = Array.from({ length: count }, (_, index) => `col-${index}`)

		// Groups of four adjacent columns, the shape a banded header takes.
		const groups: GridColumnGroup[] = Array.from({ length: Math.ceil(count / 4) }, (_, index) => ({
			id: `g${index}`,
			title: `Group ${index}`,
			columns: ids.slice(index * 4, index * 4 + 4),
		}))

		const collapsed = new Set(groups.filter((_, index) => index % 2 === 0).map((g) => g.id))

		const colToGroup = groupByColumn(groups)

		const orderable = () => true

		const pinned = () => undefined

		bench(`${count} cols · groupByColumn`, () => {
			groupByColumn(groups)
		})

		bench(`${count} cols · groupedColumnOrder`, () => {
			groupedColumnOrder(ids, groups, orderable)
		})

		bench(`${count} cols · collapsedHiddenIds (half collapsed)`, () => {
			collapsedHiddenIds(groups, collapsed)
		})

		bench(`${count} cols · buildGroupSpans`, () => {
			buildGroupSpans(ids, colToGroup, pinned)
		})
	}
})
