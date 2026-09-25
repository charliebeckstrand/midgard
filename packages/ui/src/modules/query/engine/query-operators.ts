import type { QueryField, QueryFieldType, QueryOperator } from './types'

const defaultOperators = {
	text: [
		{ value: 'equals', label: 'equals' },
		{ value: 'notEquals', label: 'does not equal' },
		{ value: 'contains', label: 'contains' },
		{ value: 'startsWith', label: 'starts with' },
		{ value: 'endsWith', label: 'ends with' },
		// The emptiness check reads as "is Empty" / "is not Empty": the operator
		// carries the relation, `valueLabel` the fixed subject it compares against.
		{ value: 'isEmpty', label: 'is', valueLabel: 'Empty', noValue: true },
		{ value: 'isNotEmpty', label: 'is not', valueLabel: 'Empty', noValue: true },
	],
	number: [
		{ value: 'equals', label: '=' },
		{ value: 'notEquals', label: '≠' },
		{ value: 'gt', label: '>' },
		{ value: 'gte', label: '≥' },
		{ value: 'lt', label: '<' },
		{ value: 'lte', label: '≤' },
		{ value: 'between', label: 'between', range: true },
	],
	date: [
		{ value: 'equals', label: 'on' },
		{ value: 'before', label: 'before' },
		{ value: 'after', label: 'after' },
	],
	select: [
		{ value: 'equals', label: 'is' },
		{ value: 'notEquals', label: 'is not' },
	],
	boolean: [
		{ value: 'isTrue', label: 'is true', noValue: true },
		{ value: 'isFalse', label: 'is false', noValue: true },
	],
} satisfies Record<QueryFieldType, QueryOperator[]>

/** Each built-in operator, in the order of the default sets: text, number, date, select, and boolean. */
const builtInOperators: QueryOperator[] = Object.values(defaultOperators).flat()

/** Resolves the operators available for a field: its explicit `operators`, else the defaults for its type. */
export function getOperators(field: QueryField): QueryOperator[] {
	return field.operators ?? defaultOperators[field.type] ?? []
}

/**
 * Finds a built-in operator by its value, or gives `undefined` when no default
 * set holds it. The default set of `type` comes first, so `equals` for the
 * `date` type reads `on`. Then the first match in the other sets wins, and the
 * text set comes first, so `notEquals` for the `boolean` type reads
 * `does not equal`. The summary reads it for an operator that the field does
 * not offer.
 *
 * @internal
 */
export function findBuiltInOperator(
	value: string,
	type?: QueryFieldType,
): QueryOperator | undefined {
	const own = type && defaultOperators[type]?.find((operator) => operator.value === value)

	return own ?? builtInOperators.find((operator) => operator.value === value)
}
