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

/** The announcement when a drag picks up a node. @internal */
export function describeDragStart(label: string, position: number, total: number): string {
	return `Picked up ${label}, position ${position} of ${total}.`
}

/** The announcement when a dragged node moves over a new position. @internal */
export function describeDragOver(label: string, position: number, total: number): string {
	return `${label} moved to position ${position} of ${total}.`
}

/** The announcement when a drag drops a node. @internal */
export function describeDragEnd(label: string, position: number, total: number): string {
	return `Dropped ${label}, position ${position} of ${total}.`
}

/** The announcement when a drag stops with no move. @internal */
export function describeDragCancel(label: string, position: number, total: number): string {
	return `Returned ${label} to position ${position} of ${total}.`
}
