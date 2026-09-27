import { describeRule, renderToken } from './query-summary'
import type { QueryField, QueryNode } from './types'

/**
 * Names a node for an announcement. An active rule reads as its summary text
 * (`Status is Active`), and a blank rule reads by its field (`Name rule`). A
 * group reads as `condition group`, which is the name of its fieldset.
 *
 * @internal
 */
export function describeNode(node: QueryNode, fields: QueryField[]): string {
	if (node.type === 'group') return 'condition group'

	const token = describeRule(node, fields)

	if (token) return renderToken(token)

	const field = fields.find((candidate) => candidate.name === node.field)

	return field ? `${field.label} rule` : 'empty rule'
}
