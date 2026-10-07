import type { JsonValue } from '../../../components/json-tree'
import { createGroup, createRule, MAX_DEPTH } from './query-node'
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
function isCompactGroup(item: JsonValue[]): item is [JsonValue, JsonValue[]] {
	return item.length === 2 && Array.isArray(item[1])
}

/** Whether a compact item has the shape of a rule. @internal */
function isCompactRule(item: JsonValue[]): boolean {
	return (
		(item.length === 3 || item.length === 4) &&
		typeof item[1] === 'string' &&
		typeof item[2] === 'string'
	)
}

/** Reads the children of a group, and drops each child that it cannot read. @internal */
function readChildren(
	items: JsonValue[],
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
function readRule(item: JsonValue[], path: string, context: ParseContext): QueryRule | undefined {
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
	item: JsonValue,
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

	let input: JsonValue

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
