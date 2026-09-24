import { imposesConstraint, isBlank } from './query-evaluate'
import { createGroup, createRule } from './query-node'
import { getOperators } from './query-operators'
import type { QueryCombinator, QueryField, QueryGroup, QueryNode, QueryRule } from './types'

/**
 * A query tree in its URL form: positional arrays with no ids.
 *
 * - A group is `[combinator, children]`.
 * - A rule is `[combinator, field, operator, value]`. It has no `value` item
 *   when its value is `undefined`.
 *
 * @internal
 */
type CompactNode =
	| [combinator: QueryCombinator, children: CompactNode[]]
	| [combinator: QueryCombinator, field: string, operator: string, value?: unknown]

/** Encodes one node in its URL form. @internal */
function compact(node: QueryNode): CompactNode {
	const combinator = node.combinator ?? 'and'

	if (node.type === 'group') return [combinator, node.children.map(compact)]

	return node.value === undefined
		? [combinator, node.field, node.operator]
		: [combinator, node.field, node.operator, node.value]
}

/**
 * Serializes a query tree to a compact JSON string for a URL search param. The
 * string has no node ids, so an equal query always gives an equal string.
 *
 * @remarks Put the string through `URLSearchParams` or `encodeURIComponent`,
 * which make it URL-safe. Do not encode it a second time. The string is also a
 * stable part of a cache key, for example a TanStack Query `queryKey`. A node
 * that has no combinator gets `and`, which is the combinator the evaluator
 * reads for it. A rule value goes through `JSON.stringify`, so use values that
 * JSON can hold.
 *
 * @example
 * ```typescript
 * const params = new URLSearchParams(location.search)
 *
 * params.set('q', serializeQuery(query))
 *
 * history.replaceState(null, '', `?${params}`)
 * ```
 *
 * @param group - The query tree, usually the root group.
 * @returns The URL form of `group`. {@link parseQuery} reads it back.
 */
export function serializeQuery(group: QueryGroup): string {
	return JSON.stringify(compact(group))
}

/** The kind of problem that {@link parseQuery} found. */
export type QueryParseIssueKind =
	/** The text is not JSON, so the parse returns no query. */
	| 'invalid-json'
	/** The root is not a group, so the parse returns no query. */
	| 'invalid-root'
	/** A node has the wrong shape, so the parse drops it. */
	| 'invalid-node'
	/** A node has a combinator other than `and` or `or`, so the parse uses `and`. */
	| 'invalid-combinator'
	/** A group is deeper than the parse reads, so the parse drops it. */
	| 'too-deep'
	/** A rule names a field that is not in `fields`, so the parse drops it. */
	| 'unknown-field'
	/** A rule names an operator that its field does not offer, so the parse drops it. */
	| 'unknown-operator'

/** One problem that {@link parseQuery} found, and repaired. */
export type QueryParseIssue = {
	/** The kind of problem. */
	kind: QueryParseIssueKind
	/** Where the problem is in the input, for example `children[1].children[0]`. */
	path: string
	/** What the parse found and what it did, for a log. */
	message: string
}

/** Options for {@link parseQuery}. */
export type QueryParseOptions = {
	/**
	 * The fields that a rule can name. When you give them, the parse drops each
	 * rule whose field is not in the list, or whose operator the field does not
	 * offer. When you do not give them, the parse checks only the structure.
	 */
	fields?: QueryField[]
}

/** The result of {@link parseQuery}. */
export type QueryParse = {
	/** The usable query, with new node ids. It is `undefined` when the input has no usable root. */
	value: QueryGroup | undefined
	/** Each problem that the parse repaired, in input order. It is empty for a sound query. */
	issues: QueryParseIssue[]
}

/**
 * The deepest group that {@link parseQuery} reads. The URL is input that the
 * app does not control, so the limit keeps a hostile string from exhausting the
 * stack.
 *
 * @internal
 */
const MAX_DEPTH = 32

/** The walk state that {@link parseQuery} passes down. @internal */
type ParseContext = {
	issues: QueryParseIssue[]
	fields: QueryField[] | undefined
}

/** Reads a combinator, and reports and repairs a bad one. @internal */
function readCombinator(value: unknown, path: string, context: ParseContext): QueryCombinator {
	if (value === 'and' || value === 'or') return value

	context.issues.push({
		kind: 'invalid-combinator',
		path,
		message: `The combinator ${JSON.stringify(value) ?? 'undefined'} is not "and" or "or". The parse used "and".`,
	})

	return 'and'
}

/** Whether a compact item has the shape of a group. @internal */
function isCompactGroup(item: unknown[]): boolean {
	return item.length === 2 && Array.isArray(item[1])
}

/** Whether a compact item has the shape of a rule. @internal */
function isCompactRule(item: unknown[]): boolean {
	return (
		(item.length === 3 || item.length === 4) &&
		typeof item[1] === 'string' &&
		typeof item[2] === 'string'
	)
}

/** Reads the children of a group, and drops each child that it cannot read. @internal */
function readChildren(
	items: unknown[],
	path: string,
	depth: number,
	context: ParseContext,
): QueryNode[] {
	const children: QueryNode[] = []

	items.forEach((item, index) => {
		const node = readNode(item, `${path}${path ? '.' : ''}children[${index}]`, depth, context)

		if (node) children.push(node)
	})

	return children
}

/** Reads a rule, and drops it when `fields` does not offer its field or operator. @internal */
function readRule(item: unknown[], path: string, context: ParseContext): QueryRule | undefined {
	const [, field, operator] = item as [unknown, string, string]

	const { fields } = context

	if (fields) {
		const match = fields.find((candidate) => candidate.name === field)

		if (!match) {
			context.issues.push({
				kind: 'unknown-field',
				path,
				message: `The field "${field}" is not in the fields. The parse dropped the rule.`,
			})

			return undefined
		}

		if (!getOperators(match).some((option) => option.value === operator)) {
			context.issues.push({
				kind: 'unknown-operator',
				path,
				message: `The field "${field}" does not offer the operator "${operator}". The parse dropped the rule.`,
			})

			return undefined
		}
	}

	return {
		...createRule(undefined, readCombinator(item[0], path, context)),
		field,
		operator,
		value: item[3],
	}
}

/** Reads one compact node, or reports why it drops it. @internal */
function readNode(
	item: unknown,
	path: string,
	depth: number,
	context: ParseContext,
): QueryNode | undefined {
	if (Array.isArray(item) && isCompactGroup(item)) {
		if (depth >= MAX_DEPTH) {
			context.issues.push({
				kind: 'too-deep',
				path,
				message: `The group is deeper than ${MAX_DEPTH} levels. The parse dropped it.`,
			})

			return undefined
		}

		const combinator = readCombinator(item[0], path, context)

		return createGroup(combinator, readChildren(item[1], path, depth + 1, context))
	}

	if (Array.isArray(item) && isCompactRule(item)) return readRule(item, path, context)

	context.issues.push({
		kind: 'invalid-node',
		path,
		message: 'The node is not a group or a rule. The parse dropped it.',
	})

	return undefined
}

/**
 * Parses the URL form that {@link serializeQuery} makes back to a query tree.
 * The parse repairs what it can. It drops each node that it cannot read, keeps
 * each other node, and reports each change. Each node gets a new id.
 *
 * @remarks The text is input that the app does not control. A missing param
 * (`null`, `undefined`, or `''`) gives no query and no issue. Text that is not
 * JSON, or a root that is not a group, gives no query and one issue. The parse
 * reads groups to a depth of 32 levels, and drops a deeper group.
 *
 * @example
 * ```typescript
 * const { value, issues } = parseQuery(params.get('q'), { fields })
 *
 * if (issues.length > 0) console.warn('Repaired the query in the URL', issues)
 * ```
 *
 * @param text - The URL form, usually the value of a search param.
 * @param options - The fields that a rule can name.
 * @returns The usable query, and each issue that the parse repaired.
 */
export function parseQuery(
	text: string | null | undefined,
	options: QueryParseOptions = {},
): QueryParse {
	const issues: QueryParseIssue[] = []

	if (text == null || text === '') return { value: undefined, issues }

	let input: unknown

	try {
		input = JSON.parse(text)
	} catch {
		issues.push({
			kind: 'invalid-json',
			path: '',
			message: 'The text is not JSON. The parse returned no query.',
		})

		return { value: undefined, issues }
	}

	if (!Array.isArray(input) || !isCompactGroup(input)) {
		issues.push({
			kind: 'invalid-root',
			path: '',
			message: 'The root is not a group. The parse returned no query.',
		})

		return { value: undefined, issues }
	}

	const value = readNode(input, '', 0, { issues, fields: options.fields }) as QueryGroup

	return { value, issues }
}

/** Options for {@link formatQuerySql}. */
export type QuerySqlOptions = {
	/**
	 * Gives the SQL column for a rule's field. The default quotes the field name
	 * as an identifier, for example `"status"`.
	 *
	 * @remarks The function writes SQL, so it must quote or allowlist a field
	 * name that comes from the user.
	 */
	column?: (field: string) => string
	/**
	 * Gives the placeholder for the parameter at a 1-based index. The default
	 * gives `?`. For PostgreSQL, give `(index) => '$' + index`.
	 */
	placeholder?: (index: number) => string
}

/** The result of {@link formatQuerySql}. */
export type QuerySql = {
	/**
	 * The condition, for the text after `WHERE`. It is `''` when the query puts
	 * no constraint on the rows.
	 */
	sql: string
	/** The value for each placeholder in `sql`, in order. */
	params: unknown[]
}

/**
 * A condition while the format builds it. `true` is a node that puts no
 * constraint on the rows. `sql` marks each parameter with {@link SLOT}, and the
 * last step replaces each mark with its placeholder.
 *
 * @internal
 */
type Clause = true | SqlClause

/** A {@link Clause} that puts a constraint on the rows. @internal */
type SqlClause = { sql: string; params: unknown[] }

/** The mark for a parameter in a {@link Clause}. @internal */
const SLOT = '\u0000'

/** Quotes a field name as a standard SQL identifier. @internal */
function quoteIdentifier(field: string): string {
	return `"${field.replaceAll('"', '""')}"`
}

/** Escapes the `LIKE` wildcards in a text with `!`, which the clause names as its escape. @internal */
function escapeLike(text: string): string {
	return text.replace(/[!%_]/g, '!$&')
}

/** One comparison with one parameter. @internal */
function compare(column: string, operator: string, value: unknown): Clause {
	return { sql: `${column} ${operator} ${SLOT}`, params: [value] }
}

/** A case-insensitive `LIKE`, as the evaluator's text matchers are. @internal */
function like(column: string, before: string, value: unknown, after: string): Clause {
	const text = escapeLike(String(value).toLowerCase())

	return { sql: `LOWER(${column}) LIKE ${SLOT} ESCAPE '!'`, params: [`${before}${text}${after}`] }
}

/**
 * The `between` clause, where a blank bound is open. The value is an array of
 * blank or scalar bounds, because {@link imposesConstraint} reads a value of a
 * different shape as no constraint.
 *
 * @internal
 */
function range(column: string, value: unknown): Clause {
	const [lo, hi] = value as unknown[]

	if (isBlank(lo)) return compare(column, '<=', Number(hi))

	if (isBlank(hi)) return compare(column, '>=', Number(lo))

	return { sql: `${column} BETWEEN ${SLOT} AND ${SLOT}`, params: [Number(lo), Number(hi)] }
}

/**
 * The clause for one rule. A rule that {@link imposesConstraint} reads as no
 * constraint gives `true`, as it does in the evaluator. Such a rule has an
 * unknown operator, an empty value, or a value of the wrong shape.
 *
 * @internal
 */
function ruleClause(rule: QueryRule, column: string): Clause {
	const { operator, value } = rule

	if (!imposesConstraint(operator, value)) return true

	switch (operator) {
		case 'equals':
			return compare(column, '=', value)
		case 'notEquals':
			// The evaluator reads a null cell as '', which differs from any value.
			return { sql: `(${column} IS NULL OR ${column} <> ${SLOT})`, params: [value] }
		case 'contains':
			return like(column, '%', value, '%')
		case 'startsWith':
			return like(column, '', value, '%')
		case 'endsWith':
			return like(column, '%', value, '')
		case 'isEmpty':
			return { sql: `(${column} IS NULL OR ${column} = '')`, params: [] }
		case 'isNotEmpty':
			return { sql: `(${column} IS NOT NULL AND ${column} <> '')`, params: [] }
		case 'gt':
			return compare(column, '>', Number(value))
		case 'gte':
			return compare(column, '>=', Number(value))
		case 'lt':
			return compare(column, '<', Number(value))
		case 'lte':
			return compare(column, '<=', Number(value))
		case 'between':
			return range(column, value)
		case 'before':
			return compare(column, '<', String(value))
		case 'after':
			return compare(column, '>', String(value))
		case 'isTrue':
			return compare(column, '=', true)
		case 'isFalse':
			return compare(column, '=', false)
		default:
			return true
	}
}

/** Joins two clauses that each put a constraint on the rows. @internal */
function join(left: SqlClause, combinator: QueryCombinator, right: SqlClause): SqlClause {
	const keyword = combinator === 'or' ? 'OR' : 'AND'

	return { sql: `(${left.sql} ${keyword} ${right.sql})`, params: [...left.params, ...right.params] }
}

/**
 * Folds a group left to right, as the evaluator does. A child with no
 * constraint drops out with its combinator. A group with no constraint gives
 * `true`.
 *
 * @internal
 */
function groupClause(group: QueryGroup, column: (field: string) => string): Clause {
	let result: SqlClause | undefined

	for (const node of group.children) {
		const clause =
			node.type === 'group' ? groupClause(node, column) : ruleClause(node, column(node.field))

		if (clause === true) continue

		result = result === undefined ? clause : join(result, node.combinator ?? 'and', clause)
	}

	return result ?? true
}

/**
 * Formats a query tree as a SQL condition with bound parameters, for the text
 * after `WHERE`. The condition keeps the meaning of `evaluateQuery`. Children
 * fold left to right by their combinator, with no `AND` over `OR` precedence.
 * Text matches ignore case.
 *
 * @remarks Each value goes into `params`, never into `sql`. A rule with no
 * constraint on the rows drops out with its combinator, as it does in the
 * evaluator. Such a rule has an empty value, a value of the wrong shape, or an
 * operator that the format does not know. So `A OR (blank rule)` gives the
 * condition for `A`. When the full query puts no constraint on the rows, `sql`
 * is `''`, so the caller omits the `WHERE`.
 * The database compares a value with its own types. So when a column type
 * differs from the value type, the rows can differ from the evaluator's rows.
 *
 * @example
 * ```typescript
 * const { sql, params } = formatQuerySql(query, { placeholder: (i) => `$${i}` })
 *
 * const rows = await db.query(`SELECT * FROM users${sql ? ` WHERE ${sql}` : ''}`, params)
 * ```
 *
 * @param group - The query tree, usually the root group.
 * @param options - The column and placeholder spelling.
 * @returns The condition and its parameters.
 */
export function formatQuerySql(group: QueryGroup, options: QuerySqlOptions = {}): QuerySql {
	const { column = quoteIdentifier, placeholder = () => '?' } = options

	const clause = groupClause(group, column)

	if (clause === true) return { sql: '', params: [] }

	let index = 0

	const sql = clause.sql.replaceAll(SLOT, () => placeholder(++index))

	return { sql, params: clause.params }
}
