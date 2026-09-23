/**
 * The filter scope of the dashboard: one filter that the app owns, and the
 * selections that the tiles make.
 *
 * The filter is a `QueryGroup` from the `query` module. A selection is a set of
 * values for one field, and it records the tile that made it. A tile sees the
 * filter and the selections of the other tiles, but not its own selections. A
 * chart therefore does not filter itself down to the bar that the user clicked.
 */

import { evaluateQuery } from '../../query/engine/query-evaluate'
import type { QueryGroup, QueryNode, QueryRule } from '../../query/engine/types'

/**
 * One cross-filter selection: the values of one field that one tile selected.
 * The values are text, because the `equals` operator compares values as text.
 */
export type DashboardSelection = {
	/** The id of the tile that made the selection, or `''` for the board itself. */
	source: string
	/** The field that the selection filters. */
	field: string
	/** The selected values. A row matches when its field equals one of them. */
	values: readonly string[]
}

/** Options for {@link selectValue}. */
export type DashboardSelectOptions = {
	/**
	 * Add the value to the selection, or remove it when it is already there. Without
	 * this flag, the value replaces the selection, and a second select of the
	 * only value clears it.
	 * @defaultValue false
	 */
	additive?: boolean
}

/** The text form of a value, as the `equals` operator reads it. */
export function selectionText(value: unknown): string {
	return value == null ? '' : String(value)
}

/**
 * The selections after `source` selects `value` in `field`. Each source keeps at
 * most one selection for each field. A selection with no values goes away.
 */
export function selectValue(
	selections: readonly DashboardSelection[],
	source: string,
	field: string,
	value: unknown,
	{ additive = false }: DashboardSelectOptions = {},
): DashboardSelection[] {
	const text = selectionText(value)

	const index = selections.findIndex((item) => item.source === source && item.field === field)

	const current = index === -1 ? [] : (selections[index]?.values ?? [])

	let values: readonly string[]

	if (additive) {
		values = current.includes(text) ? current.filter((item) => item !== text) : [...current, text]
	} else {
		values = current.length === 1 && current[0] === text ? [] : [text]
	}

	const rest = selections.filter((_, position) => position !== index)

	if (values.length === 0) return rest

	const next = { source, field, values }

	if (index === -1) return [...rest, next]

	return selections.map((item, position) => (position === index ? next : item))
}

/**
 * The selections after `source` clears its selection in `field`, or in each
 * field when you omit `field`.
 */
export function clearSelection(
	selections: readonly DashboardSelection[],
	source: string,
	field?: string,
): DashboardSelection[] {
	return selections.filter(
		(item) => item.source !== source || (field !== undefined && item.field !== field),
	)
}

/** The values that `source` selected in `field`. */
export function selectedValues(
	selections: readonly DashboardSelection[],
	source: string,
	field: string,
): readonly string[] {
	return selections.find((item) => item.source === source && item.field === field)?.values ?? []
}

/** One selection as a query group: an `equals` rule for each value, joined with `or`. */
function selectionGroup(selection: DashboardSelection): QueryGroup {
	const prefix = `dashboard-selection:${selection.source}:${selection.field}`

	return {
		id: prefix,
		type: 'group',
		combinator: 'and',
		children: selection.values.map(
			(value, index): QueryRule => ({
				id: `${prefix}:${index}`,
				type: 'rule',
				combinator: index === 0 ? undefined : 'or',
				field: selection.field,
				operator: 'equals',
				value,
			}),
		),
	}
}

/**
 * The query that the tile `viewer` sees: the filter, and each selection that
 * another tile made. Pass `null` for a reader outside any tile, which sees each
 * selection. The result is an ordinary `QueryGroup`, so `QuerySummary` can show it.
 */
export function scopeQuery(
	filter: QueryGroup | undefined,
	selections: readonly DashboardSelection[],
	viewer: string | null,
): QueryGroup {
	const children: QueryNode[] = []

	if (filter !== undefined && filter.children.length > 0) {
		children.push({ ...filter, combinator: 'and' })
	}

	for (const selection of selections) {
		if (selection.source === viewer || selection.values.length === 0) continue

		children.push(selectionGroup(selection))
	}

	return { id: 'dashboard-scope', type: 'group', children }
}

/** Whether a query holds a condition. An empty query matches each row. */
export function isScopeActive(query: QueryGroup): boolean {
	return query.children.length > 0
}

/** The rows that match `query`, read through `getValue`. */
export function scopeRows<T>(
	rows: readonly T[],
	query: QueryGroup,
	getValue: (row: T, field: string) => unknown,
): T[] {
	if (!isScopeActive(query)) return [...rows]

	return rows.filter((row) => evaluateQuery(query, (field) => getValue(row, field)))
}
