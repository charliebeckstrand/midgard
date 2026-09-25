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

/**
 * Operators that read a `[min, max]` range ({@link isRange}) as their value.
 * Each other operator that reads a value reads a scalar ({@link isScalar}).
 * Mirrors the `range` operator flag in `getOperators`.
 *
 * @internal
 */
export const RANGE_OPERATORS = new Set(['between'])

/**
 * Operators that compare a field value and the rule value as numbers. The
 * rule value, or each set bound of a range, must convert to a finite number
 * ({@link isNumeric}).
 *
 * @internal
 */
const NUMERIC_OPERATORS = new Set(['gt', 'gte', 'lt', 'lte', 'between'])

/** Coerces any value to a string for text operators; nullish becomes `''`. @internal */
function asText(value: unknown): string {
	return value == null ? '' : String(value)
}

/** Coerces any value to a number for numeric operators. @internal */
function asNumber(value: unknown): number {
	return typeof value === 'number' ? value : Number(value)
}

/**
 * Whether a range bound is blank, so that the bound is open-ended. A nullish
 * bound, and a string that is empty or holds only whitespace, are blank. The
 * evaluator, the SQL format, and the summary all read a bound through it.
 *
 * @internal
 */
export function isBlank(value: unknown): boolean {
	return value == null || (typeof value === 'string' && value.trim() === '')
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
 * Whether a value is a scalar that JSON can hold: a string, a number, or a
 * boolean. An array, an object, and a `Date` are not scalars.
 *
 * @internal
 */
function isScalar(value: unknown): boolean {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

/**
 * Whether a value is a range: a `[min, max]` pair whose bounds are each blank
 * ({@link isBlank}) or a scalar ({@link isScalar}). A blank bound is open.
 *
 * @internal
 */
function isRange(value: unknown): boolean {
	return (
		Array.isArray(value) &&
		value.length === 2 &&
		value.every((bound) => isBlank(bound) || isScalar(bound))
	)
}

/**
 * Whether a value converts to a finite number, as a numeric operator reads it.
 * For a range, each bound must convert, or be blank. So `18` and `'18'` are
 * numeric, and `'abc'` and `NaN` are not.
 *
 * @internal
 */
function isNumeric(value: unknown): boolean {
	const items = Array.isArray(value) ? value : [value]

	return items.every((item) => isBlank(item) || Number.isFinite(asNumber(item)))
}

/**
 * Whether a rule with this operator and value puts a constraint on the rows.
 * It does when the evaluator has a matcher for the operator, and the operator
 * reads no value or its value is filled ({@link isEmptyValue}). A filled value
 * must also have the shape that the operator reads: a range for an operator in
 * {@link RANGE_OPERATORS}, else a scalar. For an operator in
 * {@link NUMERIC_OPERATORS}, the value must also be numeric. The field set has
 * no part in the judgement, because the evaluator reads no field set.
 *
 * @remarks This is the one definition of an active rule. The fold, the SQL
 * format, the active judgement, and the summary all read it, so they give the
 * same reading of a rule. The own-key test stops an inherited name, such as
 * `toString`, from reading as a matcher. A `between` value that is not a range
 * ({@link isRange}), such as `5`, `[10]`, or `[[1], 5]`, reads as no
 * constraint. So does a `gt` value that is not a scalar, such as `[1, 2]`, or
 * a `gt` value that is not numeric, such as `'abc'`.
 *
 * @internal
 */
export function imposesConstraint(operator: string, value: unknown): boolean {
	if (!Object.hasOwn(matchers, operator)) return false

	if (VALUELESS_OPERATORS.has(operator)) return true

	const hasShape = RANGE_OPERATORS.has(operator) ? isRange : isScalar

	if (isEmptyValue(value) || !hasShape(value)) return false

	return !NUMERIC_OPERATORS.has(operator) || isNumeric(value)
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
 * Tests one operator against a field value and a rule value. Four cases pass as
 * "no constraint", so a half-built or cleared rule never hides rows:
 *
 * - an unknown operator;
 * - a value-requiring operator whose value is empty (a blank text box, a
 *   cleared date, an all-blank range);
 * - a value of the wrong shape for its operator, such as `5`, `[10]`, or
 *   `[[1], 5]` for `between`, or `[1, 2]` for `gt`;
 * - a value that is not numeric for a numeric operator, such as `'abc'` for
 *   `gt`, or `['abc', 10]` for `between`.
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
