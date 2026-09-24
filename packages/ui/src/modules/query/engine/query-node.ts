import { getOperators } from './query-operators'
import type { QueryCombinator, QueryField, QueryGroup, QueryNode, QueryRule } from './types'

let counter = 0

function nextId(): string {
	counter++

	return `q${counter}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Creates a fresh {@link QueryRule} with a unique id, defaulting its operator to
 * the field's first and its value to the type-appropriate empty value.
 *
 * @param field - Seeds the rule's field, operator, and value; omit for an empty rule.
 * @param combinator - How the rule joins its preceding sibling. @defaultValue 'and'
 */
export function createRule(field?: QueryField, combinator: QueryCombinator = 'and'): QueryRule {
	const operators = field ? getOperators(field) : []

	return {
		id: nextId(),
		type: 'rule',
		combinator,
		field: field?.name ?? '',
		operator: operators[0]?.value ?? '',
		value: defaultValueFor(field),
	}
}

/**
 * Creates a fresh {@link QueryGroup} with a unique id.
 *
 * @param combinator - How the group joins its preceding sibling. @defaultValue 'and'
 * @param children - Initial child nodes. @defaultValue `[]`
 */
export function createGroup(
	combinator: QueryCombinator = 'and',
	children: QueryNode[] = [],
): QueryGroup {
	return { id: nextId(), type: 'group', combinator, children }
}

function defaultValueFor(field?: QueryField): unknown {
	if (!field) return ''

	if (field.type === 'boolean') return null

	if (field.type === 'select') return field.options?.[0]?.value ?? ''

	return ''
}

/** Whether a value is a plain object, which JSON gives for `{}`. @internal */
function isFields(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Whether a value is a query node: a rule, or a group whose children are all
 * nodes. Each node needs a string `id` and, when it has one, a combinator of
 * `and` or `or`. A rule needs a string `field` and a string `operator`; its
 * `value` can be any value.
 *
 * @remarks Use it on a tree from storage or from a URL, before the evaluator or
 * the builder reads it.
 *
 * @param value - The value to test.
 * @returns Whether `value` has the full structure of a {@link QueryNode}.
 */
export function isQueryNode(value: unknown): value is QueryNode {
	if (!isFields(value) || typeof value.id !== 'string') return false

	if (value.combinator !== undefined && value.combinator !== 'and' && value.combinator !== 'or') {
		return false
	}

	if (value.type === 'rule') {
		return typeof value.field === 'string' && typeof value.operator === 'string'
	}

	return (
		value.type === 'group' && Array.isArray(value.children) && value.children.every(isQueryNode)
	)
}

/**
 * Whether a value is a query group with the full structure of
 * {@link isQueryNode}.
 *
 * @param value - The value to test.
 * @returns Whether `value` is a {@link QueryGroup}.
 */
export function isQueryGroup(value: unknown): value is QueryGroup {
	return isQueryNode(value) && value.type === 'group'
}
