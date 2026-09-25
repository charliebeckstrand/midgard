import {
	createFilteredRowModel,
	type FilterFn,
	type Row,
	type RowModel,
	type StockFeatures,
	skipFirstRun,
	type Table,
	tableMemo,
} from '@tanstack/react-table'
import {
	column_getCanGlobalFilter,
	column_getFilterFn,
	table_autoResetPageIndex,
	table_getColumn,
	table_getGlobalFilterFn,
} from '@tanstack/react-table/static-functions'

/**
 * The engine table and rows that the filtered row model reads. They take the
 * stock feature set, because `gridFeatures` holds this model, and its own type
 * would refer to itself.
 *
 * @internal
 */
// biome-ignore lint/suspicious/noExplicitAny: the stock row-model factories take a table of any data.
type FilterTable = Table<StockFeatures, any>

/** An engine row of {@link FilterTable}. @internal */
// biome-ignore lint/suspicious/noExplicitAny: as the table above.
type FilterRow = Row<StockFeatures, any>

/** A row model of {@link FilterTable}. @internal */
// biome-ignore lint/suspicious/noExplicitAny: as the table above.
type FilterRowModel = RowModel<StockFeatures, any>

/** One filter that a pass applies: the column, the function, and the resolved value. @internal */
// biome-ignore lint/suspicious/noExplicitAny: as the table above.
type ResolvedFilter = { id: string; filterFn: FilterFn<StockFeatures, any>; value: unknown }

/** The filters of one pass, and the flag ids that a row must not fail. @internal */
type Pass = { column: ResolvedFilter[]; global: ResolvedFilter[]; ids: string[] }

/** The key of the global filter in the filter flags of a row. @internal */
const GLOBAL = '__global__'

/**
 * A filtered row model that gives the same rows as `createFilteredRowModel`,
 * with no new object for each row on each pass.
 *
 * @remarks
 * The stock model gives each row two new filter-state objects on each pass,
 * also on the pass that clears the filters. Over 100,000 rows, the work to
 * make and collect those objects is the most part of what TanStack Table v9
 * added to a filter. This model writes the flags of the current filters into
 * the objects that each row already holds. A flag of an earlier filter can
 * stay there, because this model and the faceted row model read only the flags
 * of the current filters.
 *
 * The grid filters flat rows: grouping comes after filtering in the pipeline.
 * A row model with sub-rows, or the `filterFromLeafRows` option, goes to the
 * stock model. `grid-filtered-row-model.test.ts` holds the parity with it.
 *
 * @internal
 */
export function createLeanFilteredRowModel() {
	return (engine: unknown): (() => FilterRowModel) => {
		const table = engine as FilterTable

		const stock = createFilteredRowModel()(engine as never) as () => FilterRowModel

		return tableMemo({
			feature: 'columnFilteringFeature',
			table,
			fnName: 'table.getFilteredRowModel',
			memoDeps: () => [
				table.getPreFilteredRowModel(),
				table.atoms.columnFilters.get(),
				table.atoms.globalFilter.get(),
			],
			fn: () => filterPass(table, stock),
			onAfterUpdate: skipFirstRun(() => table_autoResetPageIndex(table)),
		})
	}
}

/** One pass of the lean model. It follows `_createFilteredRowModel` of v9. @internal */
function filterPass(table: FilterTable, stock: () => FilterRowModel): FilterRowModel {
	const rowModel = table.getPreFilteredRowModel()

	if (table.options.filterFromLeafRows || rowModel.rows.some((row) => row.subRows.length > 0)) {
		return stock()
	}

	const pass = resolvePass(table)

	if (!rowModel.rows.length || pass === null) return rowModel

	const rows: FilterRow[] = []

	const rowsById: Record<string, FilterRow> = Object.create(null)

	for (const row of rowModel.flatRows) {
		flagRow(row, pass)

		if (keeps(row, pass.ids)) {
			rows.push(row)

			rowsById[row.id] = row
		}
	}

	return { rows, flatRows: rows, rowsById }
}

/**
 * The filters of one pass, resolved as v9 resolves them, or `null` when no
 * filter is active. The global filter adds its flag id only when a column can
 * take it.
 *
 * @internal
 */
function resolvePass(table: FilterTable): Pass | null {
	const columnFilters = table.atoms.columnFilters.get()

	const globalFilter = table.atoms.globalFilter.get()

	const hasGlobalFilter = globalFilter !== undefined && globalFilter !== null && globalFilter !== ''

	if (!columnFilters.length && !hasGlobalFilter) return null

	const column: ResolvedFilter[] = []

	for (const columnFilter of columnFilters) {
		const target = table_getColumn(table, columnFilter.id)

		const filterFn = target ? column_getFilterFn(target) : undefined

		if (!filterFn) continue

		column.push({
			id: columnFilter.id,
			filterFn,
			value: filterFn.resolveFilterValue?.(columnFilter.value) ?? columnFilter.value,
		})
	}

	const ids = columnFilters.map((filter) => filter.id)

	const globalFilterFn = table_getGlobalFilterFn(table)

	const searched = table.getAllLeafColumns().filter((target) => column_getCanGlobalFilter(target))

	if (!hasGlobalFilter || !globalFilterFn || !searched.length) return { column, global: [], ids }

	const value = globalFilterFn.resolveFilterValue?.(globalFilter) ?? globalFilter

	return {
		column,
		global: searched.map((target) => ({ id: target.id, filterFn: globalFilterFn, value })),
		ids: [...ids, GLOBAL],
	}
}

/**
 * Writes the flags of one pass into the filter state of a row. The state is
 * the one the feature gave the row when it built it, so the pass makes no new
 * object. A filter function that adds meta writes it there too.
 *
 * @internal
 */
function flagRow(row: FilterRow, pass: Pass): void {
	const flags = row.columnFilters

	const addMeta = (id: string) => (meta: unknown) => {
		;(row.columnFiltersMeta as Record<string, unknown>)[id] = meta
	}

	for (const filter of pass.column) {
		flags[filter.id] = filter.filterFn(row, filter.id, filter.value, addMeta(filter.id))
	}

	if (!pass.global.length) return

	flags[GLOBAL] = pass.global.some((filter) =>
		filter.filterFn(row, filter.id, filter.value, addMeta(filter.id)),
	)
}

/** Whether a row fails none of the flags of the current pass. @internal */
function keeps(row: FilterRow, ids: readonly string[]): boolean {
	for (const id of ids) {
		if (row.columnFilters[id] === false) return false
	}

	return true
}
