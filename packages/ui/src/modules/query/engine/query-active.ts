import { getOperators } from './query-operators'
import type { QueryField, QueryGroup, QueryOperator, QueryRule } from './types'

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
 * Resolves a rule against the field set: the `field` it names and the
 * `operator` from that field's set, each `undefined` when unresolved. The
 * single place a rule is read into its field and operator — shared by the
 * active judgement and the summary so both interpret a rule identically.
 *
 * @internal
 */
export function resolveRule(
	rule: QueryRule,
	fields: QueryField[],
): { field: QueryField | undefined; operator: QueryOperator | undefined } {
	const field = fields.find((candidate) => candidate.name === rule.field)

	const operator = field && getOperators(field).find((option) => option.value === rule.operator)

	return { field, operator }
}

/**
 * Whether a resolved operator and value constrain the result: a value-less
 * operator (`is empty`, `is true`) always does; any other needs a non-empty
 * value. The one definition of "active", shared by the query judgement and the
 * summary.
 *
 * @internal
 */
export function imposesConstraint(operator: QueryOperator | undefined, value: unknown): boolean {
	return operator?.noValue ? true : !isEmptyValue(value)
}

/**
 * Whether a rule constrains its result, resolving its operator from the field
 * set and applying {@link imposesConstraint}.
 *
 * @internal
 */
function isRuleActive(rule: QueryRule, fields: QueryField[]): boolean {
	const { operator } = resolveRule(rule, fields)

	return imposesConstraint(operator, rule.value)
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
