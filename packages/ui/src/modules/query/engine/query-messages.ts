/**
 * The messages of the query engine: the combinators, the range of a summary,
 * the fixed subject of an emptiness check, and the names of the nodes.
 */

import { defineMessages } from '../../../primitives/intl/intl-messages'
import type { IntlShape, MessageSet } from '../../../primitives/intl/types'
import type { QueryCombinator } from './types'

// The values of each query message, by key.
type QueryValues = {
	and: Record<never, never>
	or: Record<never, never>
	range: { min: string; max: string }
	empty: Record<never, never>
	conditionGroup: Record<never, never>
	fieldRule: { field: string }
	emptyRule: Record<never, never>
}

/**
 * The messages of the query engine, by key.
 *
 * @internal
 */
export const queryMessages: MessageSet<QueryValues> = defineMessages<QueryValues>({
	and: {
		id: 'ui.query.and',
		defaultMessage: 'AND',
		description:
			'The combinator that a row must match both conditions for, between two conditions of a filter.',
	},
	or: {
		id: 'ui.query.or',
		defaultMessage: 'OR',
		description:
			'The combinator that a row must match one of the conditions for, between two conditions of a filter.',
	},
	range: {
		id: 'ui.query.range',
		defaultMessage: '{min} and {max}',
		description:
			'The value of a "between" condition of a filter, such as "Age between 18 and 65". The min and the max are numbers.',
	},
	empty: {
		id: 'ui.query.empty',
		defaultMessage: 'Empty',
		description:
			'The fixed value of a condition that checks for no text, as in "Name is Empty" and "Name is not Empty".',
	},
	conditionGroup: {
		id: 'ui.query.conditionGroup',
		defaultMessage: 'condition group',
		description:
			'The name of a nested group of filter conditions inside a sentence, such as "Picked up condition group".',
	},
	fieldRule: {
		id: 'ui.query.fieldRule',
		defaultMessage: '{field} rule',
		description:
			'The name of a filter condition with no value yet. The field is the name of its field.',
	},
	emptyRule: {
		id: 'ui.query.emptyRule',
		defaultMessage: 'empty rule',
		description: 'The name of a filter condition with no field and no value yet.',
	},
})

/**
 * The label of a combinator, such as "AND", in the language of `intl`.
 *
 * @internal
 */
export function combinatorLabel(intl: IntlShape, combinator: QueryCombinator): string {
	return intl.formatMessage(combinator === 'or' ? queryMessages.or : queryMessages.and)
}
