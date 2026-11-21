import type { JsonValue } from '../../../components/json-tree/types'

/** Boolean operator joining sibling nodes in a query group. */
export type QueryCombinator = 'and' | 'or'

/** A single leaf condition: a `field`/`operator`/`value` triple, joined to preceding siblings by `combinator`. */
export type QueryRule = {
	id: string
	type: 'rule'
	/**
	 * How the rule joins its preceding sibling.
	 *
	 * @defaultValue 'and'
	 */
	combinator?: QueryCombinator
	field: string
	operator: string
	/**
	 * The operand of the rule: a value that JSON can hold. A range operator takes
	 * a `[min, max]` pair. An operator with no operand can leave it out.
	 */
	value?: JsonValue
}

/** A node grouping `children` (rules or nested groups) under one `combinator`. */
export type QueryGroup = {
	id: string
	type: 'group'
	/**
	 * How the group joins its preceding sibling.
	 *
	 * @defaultValue 'and'
	 */
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
	/** When true, the rule omits its value input (e.g. "is Empty"). */
	noValue?: boolean
	/**
	 * Fixed value text a `noValue` operator reads against, shown in place of the
	 * omitted value input and as the summary's value (e.g. `Empty` for text's
	 * "is"), so the rule still reads as a three-part sentence. Ignored unless
	 * `noValue` is set.
	 */
	valueLabel?: string
	/**
	 * When true, the rule edits a two-bound `[min, max]` tuple (e.g. "between")
	 * instead of a single value; either bound can be left blank for an open-ended
	 * range.
	 */
	range?: boolean
	/**
	 * When true, the rule edits a set of values, a list of strings or numbers,
	 * instead of a single value (e.g. "is any of"). A row matches when its value
	 * is one member of the set. A custom value editor
	 * ({@link QueryField.editor}) writes the set.
	 */
	set?: boolean
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
	/**
	 * The `[min, max]` that the data of a `number` field holds. Each bound of a
	 * `between` rule clamps to it, and its placeholder shows it. A grid column
	 * filter fills it from the column's own values.
	 */
	span?: readonly [min: number, max: number]
	/**
	 * The key of a custom value editor. `QueryValueEditorProvider` maps each key
	 * to a component, and the builder renders that component in place of the
	 * input of `type`. A key that no provider holds falls back to the input of
	 * `type`. The key is a string and not a component, so the engine imports no
	 * React.
	 */
	editor?: string
	/**
	 * The display text of one value of the field, such as the name of the record
	 * that a key refers to. The summary, the chips, and the names of the rules
	 * read it. For a set, it formats each member. Give `undefined` for a value
	 * that has no label yet, and the reader shows the option label of a `select`
	 * field, or else the value as it is.
	 *
	 * @remarks The function is synchronous, because the summary is a pure fold.
	 * For a value that loads its label, keep the labels that the app loaded,
	 * and give a new field when more labels arrive.
	 */
	formatValue?: (value: string | number) => string | undefined
}
