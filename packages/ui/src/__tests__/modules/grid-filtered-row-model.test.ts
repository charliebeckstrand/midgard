// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import {
	type ColumnFiltersState,
	constructTable,
	createFilteredRowModel,
} from '@tanstack/react-table'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { type GridFeatures, gridFeatures } from '../../modules/grid/engine/grid-table/features'
import { filterOptions, toColumnDef } from '../../modules/grid/engine/grid-table/options'

/**
 * The grid registers a lean filtered row model in place of the stock one. It
 * reuses the filter state of each row, so a flag of an earlier filter can stay
 * on a row. Over any run of filter changes, it must keep the rows that the
 * stock model keeps, and the facets that read its flags must not change.
 */
type Row = { name: unknown; amount: unknown; note: unknown }

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', value: (row) => row.name, filterable: true },
	{ id: 'amount', title: 'Amount', value: (row) => row.amount, filterable: true },
	{ id: 'note', title: 'Note' },
]

/** A table over `rows`, with the lean model of the grid or the stock model. */
function tableOf(rows: Row[], lean: boolean) {
	// Outside React, the engine takes its reactivity from TanStack Store. In the
	// grid, `useTable` adds this feature.
	const features = {
		...gridFeatures,
		...(lean ? {} : { filteredRowModel: createFilteredRowModel() }),
		coreReactivityFeature: storeReactivityBindings(),
	}

	return constructTable({
		features: features as GridFeatures,
		data: rows,
		columns: columns.map((col) => toColumnDef(col)),
		getRowId: (_, index) => String(index),
		state: { columnFilters: [], globalFilter: '' },
		...filterOptions<Row>({ configured: true, manual: false }),
	})
}

/** One filter state: a column filter on each of some columns, and a search. */
type Step = { name: string | null; amount: number | null; search: string }

/** The column filters of a step, as query trees. */
function filtersOf(step: Step): ColumnFiltersState {
	const rule = (field: string, operator: string, value: unknown) => ({
		id: field,
		value: {
			id: 'g',
			type: 'group',
			children: [{ id: 'r', type: 'rule', field, operator, value }],
		},
	})

	return [
		...(step.name === null ? [] : [rule('name', 'contains', step.name)]),
		...(step.amount === null ? [] : [rule('amount', 'gte', step.amount)]),
	]
}

/** What a table shows for a step: the kept row ids, and the facets of each filterable column. */
function read(table: ReturnType<typeof tableOf>, step: Step) {
	// The grid controls the filter state, so the step sets it as options.
	table.setOptions((prev) => ({
		...prev,
		state: { ...prev.state, columnFilters: filtersOf(step), globalFilter: step.search },
	}))

	const facets = (id: string) => [...(table.getColumn(id)?.getFacetedUniqueValues() ?? new Map())]

	return {
		rows: table.getFilteredRowModel().rows.map((row) => row.id),
		name: facets('name'),
		amount: facets('amount'),
	}
}

const cell = fc.oneof(
	fc.string({ maxLength: 4 }),
	fc.integer({ min: -20, max: 60 }),
	fc.constantFrom(null, undefined, 'Ab', 'ab c'),
)

const rowsArb = fc.array(fc.record({ name: cell, amount: cell, note: cell }), { maxLength: 25 })

const stepArb = fc.record({
	name: fc.option(fc.constantFrom('a', 'b', 'Ab', ''), { nil: null }),
	amount: fc.option(fc.integer({ min: -10, max: 50 }), { nil: null }),
	search: fc.constantFrom('', 'a', 'b', '1', 'AB'),
})

describe('the lean filtered row model', () => {
	test.prop([rowsArb, fc.array(stepArb, { minLength: 1, maxLength: 6 })])(
		'keeps the rows and the facets of the stock model over a run of filter changes',
		(rows, steps) => {
			const lean = tableOf(rows, true)

			const stock = tableOf(rows, false)

			for (const step of steps) {
				expect(read(lean, step)).toEqual(read(stock, step))
			}
		},
	)

	it('drops the flags of an earlier filter', () => {
		const rows: Row[] = [
			{ name: 'ab', amount: 5, note: '' },
			{ name: 'b', amount: 40, note: '' },
			{ name: 'a', amount: 30, note: '' },
		]

		const lean = tableOf(rows, true)

		const ids = (step: Step) => read(lean, step).rows

		// Row 1 fails the name filter, and keeps that flag after the next step.
		expect(ids({ name: 'a', amount: null, search: '' })).toEqual(['0', '2'])

		expect(ids({ name: null, amount: 10, search: '' })).toEqual(['1', '2'])

		expect(ids({ name: null, amount: null, search: 'b' })).toEqual(['0', '1'])
	})
})
