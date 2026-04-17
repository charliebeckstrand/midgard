export type QueryCombinator = 'and' | 'or'

export type QueryRule = {
	id: string
	type: 'rule'
	field: string
	operator: string
	value: unknown
}

export type QueryGroup = {
	id: string
	type: 'group'
	combinator: QueryCombinator
	children: QueryNode[]
}

export type QueryNode = QueryRule | QueryGroup

export type QueryFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean'

export type QueryOperator = {
	/** Machine value emitted into the query. */
	value: string
	/** Human-readable label. */
	label: string
	/** When true, the rule omits its value input (e.g. "is empty"). */
	noValue?: boolean
}

export type QueryField = {
	name: string
	label: string
	type: QueryFieldType
	/** Override the default operator list for this field's type. */
	operators?: QueryOperator[]
	/** Required when `type === 'select'`. */
	options?: { label: string; value: string }[]
}
