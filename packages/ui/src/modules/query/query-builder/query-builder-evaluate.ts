import { isEmptyValue } from './query-builder-utilities'
import type { QueryGroup, QueryNode } from './types'

/**
 * Operators that evaluate without a rule value — their matcher ignores the second
 * argument. Every other operator imposes no constraint when its value is empty,
 * so a half-built or cleared rule (e.g. a date rule whose value was cleared back
 * to blank) never hides rows. Mirrors the `noValue` operator flag in
 * `getOperators`.
 *
 * @internal
 */
const VALUELESS_OPERATORS = new Set(['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'])

/** Coerces any value to a string for text operators; nullish becomes `''`. @internal */
function asText(value: unknown): string {
	return value == null ? '' : String(value)
}

/** Coerces any value to a number for numeric operators. @internal */
function asNumber(value: unknown): number {
	return typeof value === 'number' ? value : Number(value)
}

/** True for a nullish or empty-string range bound, treated as open-ended. @internal */
function isBlank(value: unknown): boolean {
	return value == null || value === ''
}

/**
 * Predicate per operator value, over a field value and the rule's value. Mirrors
 * the default operator sets in {@link getOperators}; text matches are
 * case-insensitive, date comparisons rely on ISO (`YYYY-MM-DD`) string order.
 *
 * @internal
 */
const matchers: Record<string, (fieldValue: unknown, ruleValue: unknown) => boolean> = {
	equals: (a, b) => asText(a) === asText(b),
	notEquals: (a, b) => asText(a) !== asText(b),
	contains: (a, b) => asText(a).toLowerCase().includes(asText(b).toLowerCase()),
	startsWith: (a, b) => asText(a).toLowerCase().startsWith(asText(b).toLowerCase()),
	endsWith: (a, b) => asText(a).toLowerCase().endsWith(asText(b).toLowerCase()),
	isEmpty: (a) => asText(a) === '',
	isNotEmpty: (a) => asText(a) !== '',
	gt: (a, b) => asNumber(a) > asNumber(b),
	gte: (a, b) => asNumber(a) >= asNumber(b),
	lt: (a, b) => asNumber(a) < asNumber(b),
	lte: (a, b) => asNumber(a) <= asNumber(b),
	between: (a, b) => {
		if (!Array.isArray(b)) return true

		// A blank bound is open-ended (±∞), so one-sided ranges still constrain.
		const lo = isBlank(b[0]) ? Number.NEGATIVE_INFINITY : asNumber(b[0])
		const hi = isBlank(b[1]) ? Number.POSITIVE_INFINITY : asNumber(b[1])

		const value = asNumber(a)

		return value >= lo && value <= hi
	},
	before: (a, b) => asText(a) < asText(b),
	after: (a, b) => asText(a) > asText(b),
	isTrue: (a) => a === true,
	isFalse: (a) => a === false,
}

/**
 * Tests one operator against a field value and a rule value. Three cases pass as
 * "no constraint" so a half-built or cleared rule never hides rows: an unknown
 * operator, and a value-requiring operator whose value is empty (a blank text
 * box, a cleared date, an all-blank range). Value-less operators (`is empty`,
 * `is true`, …) evaluate regardless.
 */
export function matchQueryRule(operator: string, fieldValue: unknown, ruleValue: unknown): boolean {
	const matcher = matchers[operator]

	if (!matcher) return true

	if (!VALUELESS_OPERATORS.has(operator) && isEmptyValue(ruleValue)) return true

	return matcher(fieldValue, ruleValue)
}

/** Evaluates one node — a rule via {@link matchQueryRule}, a group via {@link evaluateQuery}. @internal */
function evaluateNode(node: QueryNode, getValue: (field: string) => unknown): boolean {
	return node.type === 'group'
		? evaluateQuery(node, getValue)
		: matchQueryRule(node.operator, getValue(node.field), node.value)
}

/**
 * Evaluates a query tree against a row, reading each rule's field through
 * `getValue`. Children fold left-to-right by their `combinator` (no AND/OR
 * precedence — sequential, matching the builder's visual order); an empty group
 * matches everything.
 *
 * @param group - The query group (typically the root) to evaluate.
 * @param getValue - Resolves a field name to that row's value.
 * @returns Whether the row satisfies the query.
 */
export function evaluateQuery(group: QueryGroup, getValue: (field: string) => unknown): boolean {
	const [first, ...rest] = group.children

	if (!first) return true

	let result = evaluateNode(first, getValue)

	for (const node of rest) {
		const value = evaluateNode(node, getValue)

		result = (node.combinator ?? 'and') === 'and' ? result && value : result || value
	}

	return result
}
