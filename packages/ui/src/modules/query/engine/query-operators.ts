import { defineMessages } from '../../../primitives/intl/intl-messages'
import type { IntlShape, MessageDescriptor } from '../../../primitives/intl/types'
import { queryMessages } from './query-messages'
import type { QueryField, QueryFieldType, QueryOperator } from './types'

const messages = defineMessages({
	textEquals: {
		id: 'ui.query.textEquals',
		defaultMessage: 'equals',
		description: 'The operator of a text condition of a filter: the text is the value.',
	},
	textNotEquals: {
		id: 'ui.query.textNotEquals',
		defaultMessage: 'does not equal',
		description: 'The operator of a text condition of a filter: the text is not the value.',
	},
	contains: {
		id: 'ui.query.contains',
		defaultMessage: 'contains',
		description: 'The operator of a text condition of a filter: the text holds the value.',
	},
	startsWith: {
		id: 'ui.query.startsWith',
		defaultMessage: 'starts with',
		description: 'The operator of a text condition of a filter: the text starts with the value.',
	},
	endsWith: {
		id: 'ui.query.endsWith',
		defaultMessage: 'ends with',
		description: 'The operator of a text condition of a filter: the text ends with the value.',
	},
	textIs: {
		id: 'ui.query.textIs',
		defaultMessage: 'is',
		description: 'The operator of the condition "is Empty" of a text field in a filter.',
	},
	textIsNot: {
		id: 'ui.query.textIsNot',
		defaultMessage: 'is not',
		description: 'The operator of the condition "is not Empty" of a text field in a filter.',
	},
	between: {
		id: 'ui.query.between',
		defaultMessage: 'between',
		description: 'The operator of a number condition of a filter: the number is in a range.',
	},
	on: {
		id: 'ui.query.on',
		defaultMessage: 'on',
		description: 'The operator of a date condition of a filter: the date is the value.',
	},
	before: {
		id: 'ui.query.before',
		defaultMessage: 'before',
		description: 'The operator of a date condition of a filter: the date is before the value.',
	},
	after: {
		id: 'ui.query.after',
		defaultMessage: 'after',
		description: 'The operator of a date condition of a filter: the date is after the value.',
	},
	selectIs: {
		id: 'ui.query.selectIs',
		defaultMessage: 'is',
		description: 'The operator of a choice condition of a filter: the choice is the value.',
	},
	selectIsNot: {
		id: 'ui.query.selectIsNot',
		defaultMessage: 'is not',
		description: 'The operator of a choice condition of a filter: the choice is not the value.',
	},
	isTrue: {
		id: 'ui.query.isTrue',
		defaultMessage: 'is true',
		description: 'The operator of a yes-or-no condition of a filter: the value is yes.',
	},
	isFalse: {
		id: 'ui.query.isFalse',
		defaultMessage: 'is false',
		description: 'The operator of a yes-or-no condition of a filter: the value is no.',
	},
})

// The message of the label and of the fixed value of each built-in operator
// that has words. A symbol, such as `≥`, has no message.
const builtInMessages = new WeakMap<
	QueryOperator,
	{ label: MessageDescriptor; valueLabel?: MessageDescriptor }
>()

// A built-in operator whose label is a message. Its `label` and `valueLabel`
// hold the English defaults, for a reader of the operator that has no intl.
function worded(
	value: string,
	label: MessageDescriptor,
	extra: Omit<QueryOperator, 'value' | 'label' | 'valueLabel'> & {
		valueLabel?: MessageDescriptor
	} = {},
): QueryOperator {
	const { valueLabel, ...rest } = extra

	const operator: QueryOperator = {
		value,
		label: label.defaultMessage as string,
		...(valueLabel ? { valueLabel: valueLabel.defaultMessage as string } : {}),
		...rest,
	}

	builtInMessages.set(operator, { label, valueLabel })

	return operator
}

const defaultOperators = {
	text: [
		worded('equals', messages.textEquals),
		worded('notEquals', messages.textNotEquals),
		worded('contains', messages.contains),
		worded('startsWith', messages.startsWith),
		worded('endsWith', messages.endsWith),
		// The emptiness check reads as "is Empty" / "is not Empty": the operator
		// carries the relation, `valueLabel` the fixed subject it compares against.
		worded('isEmpty', messages.textIs, { valueLabel: queryMessages.empty, noValue: true }),
		worded('isNotEmpty', messages.textIsNot, { valueLabel: queryMessages.empty, noValue: true }),
	],
	number: [
		{ value: 'equals', label: '=' },
		{ value: 'notEquals', label: '≠' },
		{ value: 'gt', label: '>' },
		{ value: 'gte', label: '≥' },
		{ value: 'lt', label: '<' },
		{ value: 'lte', label: '≤' },
		worded('between', messages.between, { range: true }),
	],
	date: [
		worded('equals', messages.on),
		worded('before', messages.before),
		worded('after', messages.after),
	],
	select: [worded('equals', messages.selectIs), worded('notEquals', messages.selectIsNot)],
	boolean: [
		worded('isTrue', messages.isTrue, { noValue: true }),
		worded('isFalse', messages.isFalse, { noValue: true }),
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

/**
 * The label of `operator` in the language of `intl`. A built-in operator takes
 * its label from the catalog. An operator of the app, or a copy of a built-in
 * operator, keeps its own `label`.
 *
 * @internal
 */
export function operatorLabel(intl: IntlShape, operator: QueryOperator): string {
	const message = builtInMessages.get(operator)?.label

	return message ? intl.formatMessage(message) : operator.label
}

/**
 * The fixed value of a value-less `operator`, such as "Empty", in the language
 * of `intl`, or `undefined` when it names none. It reads the catalog as
 * {@link operatorLabel} does.
 *
 * @internal
 */
export function operatorValueLabel(intl: IntlShape, operator: QueryOperator): string | undefined {
	const message = builtInMessages.get(operator)?.valueLabel

	return message ? intl.formatMessage(message) : operator.valueLabel
}
