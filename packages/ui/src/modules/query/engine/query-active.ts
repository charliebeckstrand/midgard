import { getOperators } from './query-operators'
import type { QueryField, QueryGroup, QueryRule } from './types'

/**
 * Whether a value counts as filled for an operator that needs one. Nullish,
 * blank or whitespace-only strings, and empty arrays read as empty. Shared with
 * the evaluator so a rule the builder reads as inactive imposes no constraint on
 * rows (the "active" notion and the filter result stay in step).
 *
 * @internal
 */
export function isEmptyValue(value: unknown): boolean {
	if (value == null) return true

	if (typeof value === 'string') return value.trim() === ''

	// A range tuple is empty only when every bound is — an open-ended range with
	// one bound set still constrains rows.
	if (Array.isArray(value)) return value.every((item) => isEmptyValue(item))

	return false
}

/**
 * Whether a rule constrains its result: a value-less operator (`is empty`,
 * `is true`) always does; any other operator needs a non-empty value. The
 * operator's `noValue` flag is resolved from the rule's field. Shared with the
 * summary so a rule the builder reads as inactive is the one the summary omits.
 *
 * @internal
 */
export function isRuleActive(rule: QueryRule, fields: QueryField[]): boolean {
	const field = fields.find((candidate) => candidate.name === rule.field)

	const operator = field && getOperators(field).find((option) => option.value === rule.operator)

	if (operator?.noValue) return true

	return !isEmptyValue(rule.value)
}

/**
 * Whether a query would actually constrain its result: true when any rule (at
 * any depth) carries a non-empty value or uses a value-less operator (`is
 * empty`, `is true`, …). A tree of only blank rules — what a freshly seeded or
 * fully cleared builder leaves behind — reads as inactive, so a filter
 * affordance can reflect a real constraint rather than the mere presence of a
 * rule.
 *
 * @param group - The query group (typically the root) to test.
 * @param fields - Field definitions resolving each rule's operator set.
 */
export function isQueryActive(group: QueryGroup, fields: QueryField[]): boolean {
	return group.children.some((child) =>
		child.type === 'group' ? isQueryActive(child, fields) : isRuleActive(child, fields),
	)
}
