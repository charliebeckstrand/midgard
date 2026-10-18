import type { IntlShape } from '../../../primitives/intl/types'
import { queryMessages } from './query-messages'
import { describeRule, renderToken } from './query-summary'
import type { QueryField, QueryNode } from './types'

/**
 * Names a node for an announcement. An active rule reads as its summary text
 * (`Status is Active`), and a blank rule reads by its field (`Name rule`). A
 * group reads as `condition group`. Each name is in the language of `intl`.
 *
 * @internal
 */
export function describeNode(intl: IntlShape, node: QueryNode, fields: QueryField[]): string {
	if (node.type === 'group') return intl.formatMessage(queryMessages.conditionGroup)

	const token = describeRule(intl, node, fields)

	if (token) return renderToken(token)

	const field = fields.find((candidate) => candidate.name === node.field)

	return field
		? intl.formatMessage(queryMessages.fieldRule, { field: field.label })
		: intl.formatMessage(queryMessages.emptyRule)
}
