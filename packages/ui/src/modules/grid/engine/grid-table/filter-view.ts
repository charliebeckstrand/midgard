import { toNumericCell } from '../../../../utilities'
import { isQueryActive } from '../../../query/engine/query-active'
import { isQueryGroup } from '../../../query/engine/query-node'
import type { QueryGroup } from '../../../query/engine/types'
import type { GridColumn, GridColumnFilterState } from '../../types'
import { type ColumnTests, type RowTest, uniqueValues } from '../grid-filter/filter'
import { compileSearch } from '../grid-search/search'
import { naturalCollator } from '../grid-sort/utilities'
import type { EngineTable } from './features'

/**
 * The faceted values of a column: the values its cells hold in the rows that the
 * other filters leave.
 *
 * @internal
 */
export type GridColumnFacets = {
	/**
	 * The distinct cell values, sorted and de-duplicated — what a `select` filter
	 * offers when it declares no explicit `filterOptions`. Empty under
	 * server-side (manual) filtering or for a column without a value accessor.
	 */
	values: string[]
	/**
	 * The `[min, max]` of the numeric cell values, or `undefined` when there is
	 * none. A `number` filter's `between` editor clamps to it. It is `undefined`
	 * under server-side (manual) filtering, as `values` is empty there.
	 */
	span: readonly [number, number] | undefined
}

/**
 * Per-column filter controls the header filter sheets render from.
 *
 * @remarks A value with actions. The applied queries, the affordance, and the
 * open-request are a snapshot, and the grid gives a new object each time one
 * of them changes. The actions read or write the engine, so the render code
 * calls them only from an event or an effect.
 *
 * @internal
 */
export type GridColumnFilter = {
	/** Whether the column accepts a filter (declared `filterable` with a `value`). */
	canFilter: (id: string | number) => boolean
	/** Current query tree for the column, or `undefined` when unfiltered. */
	getQuery: (id: string | number) => QueryGroup | undefined
	/**
	 * Whether any column carries a filter that actually constrains rows. It is the
	 * same row-constraining test the header buttons read for their active accent
	 * (a real value or a value-less operator, not a merely-seeded rule). Drives the
	 * toolbar's "Clear filters" affordance.
	 */
	active: boolean
	/** Set (or, with `undefined`, clear) the column's query tree. */
	setQuery: (id: string | number, query: QueryGroup | undefined) => void
	/** Lift every column's applied filter at once, recovering all hidden rows. */
	clear: () => void
	/**
	 * Reads the column's {@link GridColumnFacets}, which the grid computes from
	 * its own rows (see {@link columnFilterActions}). The facets change with the
	 * rows and the other filters, so a sheet reads them when it opens.
	 */
	facets: (id: string | number) => GridColumnFacets
	/**
	 * How a filterable column surfaces its filter. `'header'` (default) shows the
	 * funnel button in every filterable column header. `'menu'` drops the resting
	 * funnel, reclaiming the header width, and offers the filter from the column's
	 * right-click menu instead. The funnel returns only once a filter is applied,
	 * as the edit/clear affordance.
	 */
	affordance: 'header' | 'menu'
	/** The column whose filter sheet was asked to open (from the menu), or `null`. */
	openColumn: string | number | null
	/** Ask a column's filter sheet to open (or clear the request with `null`). */
	requestOpen: (id: string | number | null) => void
}

/** The actions of {@link GridColumnFilter} that reach the engine. @internal */
export type GridColumnFilterActions = Pick<GridColumnFilter, 'setQuery' | 'clear' | 'facets'>

/** Global-filter view the search input renders from. @internal */
export type GridGlobalFilterView = {
	value: string
	setValue: (value: string) => void
	placeholder: string
}

/** Resolves the table-wide filter mode shared by the global and per-column filters. @internal */
export function resolveFilterMode(args: {
	globalConfigured: boolean
	hasColumnFilters: boolean
	globalManual: boolean | undefined
	columnManual: boolean | undefined
}): { configured: boolean; manual: boolean } {
	return {
		configured: args.globalConfigured || args.hasColumnFilters,
		// The grid filters both surfaces in one client pass (see `useGridClientView`),
		// so the mode is table-wide: manual if either surface requests it. Manual
		// wins, because a client pass over server-bound filters filters data that
		// the server already filtered. `useGridTable` warns (dev) when the two
		// flags of the surfaces disagree.
		manual: Boolean(args.globalManual || args.columnManual),
	}
}

/**
 * The `[min, max]` of the numbers among a column's faceted values, or
 * `undefined` when there is no number. A cell reads through `toNumericCell`,
 * so a number or a numeric string counts. A blank cell is no number, so it
 * does not pull the minimum to 0, as `getFacetedMinMaxValues` does.
 *
 * @internal
 */
export function facetSpan(values: Iterable<unknown>): readonly [number, number] | undefined {
	let min = Number.POSITIVE_INFINITY

	let max = Number.NEGATIVE_INFINITY

	for (const value of values) {
		const number = toNumericCell(value)

		if (!Number.isFinite(number)) continue

		if (number < min) min = number

		if (number > max) max = number
	}

	return min <= max ? [min, max] : undefined
}

/** The facets of a column with none. @internal */
const NO_FACETS: GridColumnFacets = { values: [], span: undefined }

/**
 * The facets of a column from the distinct values of its cells. The facets
 * hold each value that is not blank as text, and the span of the numbers.
 * The text sorts by {@link naturalCollator}, as the string sort of the grid
 * does, so "2" comes before "10".
 *
 * @param locale - The locale that the values collate in.
 * @internal
 */
export function toColumnFacets(values: Iterable<unknown>, locale?: string): GridColumnFacets {
	const all = [...values]

	const text = all.filter((value) => value != null && value !== '').map((value) => String(value))

	return {
		values: [...new Set(text)].sort(naturalCollator(locale).compare),
		span: facetSpan(all),
	}
}

/**
 * The actions of {@link GridColumnFilter}. The filter actions write the
 * engine when they run.
 *
 * @param manual - Whether the consumer filters. A manual grid holds only the
 *   server page, so its columns have no facets.
 * @param facetValues - The distinct cell values that the facets of a column
 *   read, which the grid collects itself (see `useFacetSource`).
 * @param locale - The locale that the facet values collate in.
 * @internal
 */
export function columnFilterActions<T>(
	table: EngineTable<T>,
	manual: boolean,
	facetValues: (id: string) => Iterable<unknown>,
	locale?: string,
): GridColumnFilterActions {
	return {
		setQuery: (id, query) => table.getColumn(String(id))?.setFilterValue(query),
		// Replace the whole applied set with an empty one; it flows through the
		// engine's `onColumnFiltersChange` like any other filter edit.
		clear: () => table.setColumnFilters([]),
		facets: (id) => {
			if (manual) return NO_FACETS

			return toColumnFacets(facetValues(String(id)), locale)
		},
	}
}

/**
 * The facet values of each column over one set of rows, filters, and query.
 * Each column collects its values on its first read, and keeps them. The
 * search compiles on the first read of any column.
 *
 * @remarks
 * A plain function, not a hook body, so that the cache of the values lives
 * with the source that fills it. The React Compiler can memoize an allocation
 * in a hook body on its own, which would share one cache among sources.
 *
 * @internal
 */
export function facetSource<T>(
	rows: readonly T[],
	columns: readonly GridColumn<T>[],
	columnTests: ColumnTests<T>,
	query: string,
): (id: string) => Set<unknown> {
	const byId = new Map(columns.map((col) => [String(col.id), col] as const))

	const cache = new Map<string, Set<unknown>>()

	// Compiled on the first read. A source that no sheet reads, such as each
	// source of a manual search, builds no haystack.
	let search: RowTest<T> | null | undefined

	return (id) => {
		let values = cache.get(id)

		if (!values) {
			const read = byId.get(id)?.value

			const tests = [...columnTests].flatMap(([other, test]) => (other === id ? [] : [test]))

			if (search === undefined) search = compileSearch(rows, columns, query)

			if (search) tests.push(search)

			values = read ? uniqueValues(rows, read, tests) : new Set()

			cache.set(id, values)
		}

		return values
	}
}

/**
 * Assembles the {@link GridColumnFilter} value over the applied filters.
 *
 * @internal
 */
export function buildColumnFilters<T>(args: {
	columns: readonly GridColumn<T>[]
	applied: readonly GridColumnFilterState[]
	actions: GridColumnFilterActions
	affordance: GridColumnFilter['affordance']
	openColumn: string | number | null
	requestOpen: (id: string | number | null) => void
}): GridColumnFilter {
	const filterable = new Set(
		args.columns.filter((col) => col.filterable && col.value).map((col) => String(col.id)),
	)

	// A controlled binding can carry any value, so each entry is checked as a
	// query. An entry on a column that cannot filter filters no row, so it
	// counts for nothing.
	const queries = new Map<string, QueryGroup>()

	for (const entry of args.applied) {
		if (filterable.has(entry.id) && isQueryGroup(entry.value)) queries.set(entry.id, entry.value)
	}

	return {
		canFilter: (id) => filterable.has(String(id)),
		getQuery: (id) => queries.get(String(id)),
		// The same test each header button reads for its accent, so the toolbar
		// affordance shows exactly when a header accent does. A seeded but blank
		// query constrains nothing and reads inactive in both places.
		active: [...queries.values()].some(isQueryActive),
		...args.actions,
		affordance: args.affordance,
		openColumn: args.openColumn,
		requestOpen: args.requestOpen,
	}
}

/**
 * Whether a filterable column shows its filter button. It shows when the grid
 * has data, or — even with an empty view — when this column carries an active
 * filter. A filter that emptied the grid can therefore still be reached and
 * cleared.
 *
 * @internal
 */
export function showsFilterButton(
	filter: GridColumnFilter,
	columnId: string | number,
	interactive: boolean,
	filterQuery: QueryGroup | undefined,
): boolean {
	if (!filter.canFilter(columnId)) return false

	return interactive || (filterQuery?.children.length ?? 0) > 0
}
