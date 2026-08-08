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

	if (field.type === 'number') return ''

	return ''
}
