import type { QueryGroup } from './types'

/**
 * Whether a value counts as filled for an operator that needs one. Nullish,
 * blank or whitespace-only strings, and empty arrays read as empty.
 * {@link imposesConstraint} reads it, so an operator that needs a value puts no
 * constraint on the rows while its value is empty.
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
 * Operators that evaluate without a rule value — their matcher ignores the second
 * argument. Every other operator imposes no constraint when its value is empty.
 * A half-built or cleared rule therefore never hides rows, such as a date rule
 * whose value was cleared back to blank. Mirrors the `noValue` operator flag in
 * `getOperators`.
 *
 * @internal
 */
export const VALUELESS_OPERATORS = new Set(['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'])

/** Coerces any value to a string for text operators; nullish becomes `''`. @internal */
function asText(value: unknown): string {
	return value == null ? '' : String(value)
}

/** Coerces any value to a number for numeric operators. @internal */
function asNumber(value: unknown): number {
	return typeof value === 'number' ? value : Number(value)
}

/** True for a nullish or empty-string range bound, treated as open-ended. @internal */
export function isBlank(value: unknown): boolean {
	return value == null || value === ''
}

/**
 * Predicate per operator value, over a field value and the rule's value. Mirrors
 * the default operator sets in {@link getOperators}; text matches are
 * case-insensitive, date comparisons rely on ISO (`YYYY-MM-DD`) string order.
 * A predicate gets only a rule value that {@link imposesConstraint} accepts, so
 * it does not check the shape of that value.
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
		const [low, high] = b as unknown[]

		// A blank bound is open-ended (±∞), so one-sided ranges still constrain.
		const lo = isBlank(low) ? Number.NEGATIVE_INFINITY : asNumber(low)
		const hi = isBlank(high) ? Number.POSITIVE_INFINITY : asNumber(high)

		const value = asNumber(a)

		return value >= lo && value <= hi
	},
	before: (a, b) => asText(a) < asText(b),
	after: (a, b) => asText(a) > asText(b),
	isTrue: (a) => a === true,
	isFalse: (a) => a === false,
}

/**
 * The value shape per operator value, for an operator that reads one shape
 * only. A rule value of a different shape puts no constraint on the rows. An
 * operator without an entry reads a value of any shape.
 *
 * @internal
 */
const valueShapes: Record<string, (ruleValue: unknown) => boolean> = {
	between: Array.isArray,
}

/**
 * Whether a rule with this operator and value puts a constraint on the rows.
 * It does when the evaluator has a matcher for the operator, and the operator
 * reads no value or its value is filled ({@link isEmptyValue}). A filled value
 * must also have the shape that the operator reads. The field set has no part
 * in the judgement, because the evaluator reads no field set.
 *
 * @remarks This is the one definition of an active rule. The fold, the SQL
 * format, the active judgement, and the summary all read it, so they give the
 * same reading of a rule. The own-key test stops an inherited name, such as
 * `toString`, from reading as a matcher. A `between` value that is not an
 * array, such as `5`, reads as no constraint.
 *
 * @internal
 */
export function imposesConstraint(operator: string, value: unknown): boolean {
	if (!Object.hasOwn(matchers, operator)) return false

	if (VALUELESS_OPERATORS.has(operator)) return true

	return !isEmptyValue(value) && (valueShapes[operator]?.(value) ?? true)
}

/**
 * Tests one operator against a field value and a rule value, or gives
 * `undefined` when the rule puts no constraint on the rows. See
 * {@link matchQueryRule} for the cases. The fold in {@link evaluateQuery} drops
 * such a rule.
 *
 * @internal
 */
function testRule(operator: string, fieldValue: unknown, ruleValue: unknown): boolean | undefined {
	if (!imposesConstraint(operator, ruleValue)) return undefined

	return matchers[operator]?.(fieldValue, ruleValue)
}

/**
 * Tests one operator against a field value and a rule value. Three cases pass as
 * "no constraint", so a half-built or cleared rule never hides rows:
 *
 * - an unknown operator;
 * - a value-requiring operator whose value is empty (a blank text box, a
 *   cleared date, an all-blank range);
 * - a value of the wrong shape for its operator, such as a `between` value
 *   that is not an array.
 *
 * Value-less operators (`is Empty`, `is true`, …) evaluate regardless.
 */
export function matchQueryRule(operator: string, fieldValue: unknown, ruleValue: unknown): boolean {
	return testRule(operator, fieldValue, ruleValue) ?? true
}

/**
 * Folds a group's children left to right, or gives `undefined` when no child
 * puts a constraint on the rows. A child with no constraint drops out, and its
 * combinator drops with it.
 *
 * @internal
 */
function foldGroup(group: QueryGroup, getValue: (field: string) => unknown): boolean | undefined {
	let result: boolean | undefined

	for (const node of group.children) {
		const value =
			node.type === 'group'
				? foldGroup(node, getValue)
				: testRule(node.operator, getValue(node.field), node.value)

		if (value === undefined) continue

		if (result === undefined) result = value
		else result = (node.combinator ?? 'and') === 'and' ? result && value : result || value
	}

	return result
}

/**
 * Evaluates a query tree against a row, reading each rule's field through
 * `getValue`. Children fold left-to-right by their `combinator` (no AND/OR
 * precedence — sequential, matching the builder's visual order).
 *
 * @remarks A child that puts no constraint on the rows drops out of the fold,
 * with its combinator. Such a child is a rule that {@link matchQueryRule} passes
 * as no constraint, or a group of such children. So `A OR (blank rule)` reads
 * as `A`, as the summary shows it. A query with no constraint matches every row.
 *
 * @param group - The query group (typically the root) to evaluate.
 * @param getValue - Resolves a field name to that row's value.
 * @returns Whether the row satisfies the query.
 */
export function evaluateQuery(group: QueryGroup, getValue: (field: string) => unknown): boolean {
	return foldGroup(group, getValue) ?? true
}
