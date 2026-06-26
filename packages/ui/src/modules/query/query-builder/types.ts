/** Boolean operator joining sibling nodes in a query group. */
export type QueryCombinator = 'and' | 'or'

/** A single leaf condition: a `field`/`operator`/`value` triple, joined to preceding siblings by `combinator`. */
export type QueryRule = {
	id: string
	type: 'rule'
	combinator?: QueryCombinator
	field: string
	operator: string
	value: unknown
}

/** A node grouping `children` (rules or nested groups) under one `combinator`. */
export type QueryGroup = {
	id: string
	type: 'group'
	combinator?: QueryCombinator
	children: QueryNode[]
}

/** Any node in the query tree: a {@link QueryRule} or a {@link QueryGroup}. */
export type QueryNode = QueryRule | QueryGroup

/** Data type of a queryable field; selects the rule's operator set and value input. */
export type QueryFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean'

/** A comparison operator offered for a field. */
export type QueryOperator = {
	/** Machine value emitted into the query. */
	value: string
	/** Human-readable label. */
	label: string
	/** When true, the rule omits its value input (e.g. "is empty"). */
	noValue?: boolean
	/**
	 * When true, the rule edits a two-bound `[min, max]` tuple (e.g. "between")
	 * instead of a single value; either bound may be left blank for an open-ended
	 * range.
	 */
	range?: boolean
}

/** A queryable field definition: its `name`, display `label`, type, and optional operator/option overrides. */
export type QueryField = {
	name: string
	label: string
	type: QueryFieldType
	/** Overrides the default operator list for this field's type. */
	operators?: QueryOperator[]
	/** Required when `type === 'select'`. */
	options?: { label: string; value: string }[]
}
