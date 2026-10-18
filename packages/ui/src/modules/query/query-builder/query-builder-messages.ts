import { defineMessages } from '../../../primitives/intl/intl-messages'
import type { MessageSet } from '../../../primitives/intl/types'

// The values of each message of the query builder, by key.
type QueryBuilderValues = {
	combinator: Record<never, never>
	group: Record<never, never>
	noRules: Record<never, never>
	add: Record<never, never>
	addRule: Record<never, never>
	addGroup: Record<never, never>
	removeGroup: Record<never, never>
	holdToRemoveGroup: Record<never, never>
	field: Record<never, never>
	operator: Record<never, never>
	removeRule: Record<never, never>
	value: Record<never, never>
	min: Record<never, never>
	max: Record<never, never>
	fieldValue: { field: string }
	fieldMin: { field: string }
	fieldMax: { field: string }
}

/**
 * The messages of the query builder: its groups, its rules, and the editors of
 * the values.
 *
 * @internal
 */
export const queryBuilderMessages: MessageSet<QueryBuilderValues> =
	defineMessages<QueryBuilderValues>({
		combinator: {
			id: 'ui.queryBuilder.combinator',
			defaultMessage: 'Combinator',
			description:
				'The name of the control that picks AND or OR between two conditions of a filter.',
		},
		group: {
			id: 'ui.queryBuilder.group',
			defaultMessage: 'Condition group',
			description: 'The name of a nested group of filter conditions.',
		},
		noRules: {
			id: 'ui.queryBuilder.noRules',
			defaultMessage: 'No rules added',
			description: 'The warning of a group of a filter that holds no conditions.',
		},
		add: {
			id: 'ui.queryBuilder.add',
			defaultMessage: 'Add',
			description: 'The button that opens a menu to add a condition or a group to a filter.',
		},
		addRule: {
			id: 'ui.queryBuilder.addRule',
			defaultMessage: 'Add rule',
			description: 'The menu item that adds a condition to a filter.',
		},
		addGroup: {
			id: 'ui.queryBuilder.addGroup',
			defaultMessage: 'Add group',
			description: 'The menu item that adds a nested group of conditions to a filter.',
		},
		removeGroup: {
			id: 'ui.queryBuilder.removeGroup',
			defaultMessage: 'Remove group',
			description: 'The button that removes a nested group of conditions from a filter.',
		},
		holdToRemoveGroup: {
			id: 'ui.queryBuilder.holdToRemoveGroup',
			defaultMessage: 'Hold to remove group',
			description:
				'The tooltip of the Remove group button, which removes the group only after a long press.',
		},
		field: {
			id: 'ui.queryBuilder.field',
			defaultMessage: 'Field',
			description: 'The name of the control that picks the field of a filter condition.',
		},
		operator: {
			id: 'ui.queryBuilder.operator',
			defaultMessage: 'Operator',
			description:
				'The name of the control that picks the operator of a filter condition, such as "contains".',
		},
		removeRule: {
			id: 'ui.queryBuilder.removeRule',
			defaultMessage: 'Remove rule',
			description: 'The name of the button that removes a condition from a filter.',
		},
		value: {
			id: 'ui.queryBuilder.value',
			defaultMessage: 'Value',
			description: 'The hint text of the empty value field of a filter condition.',
		},
		min: {
			id: 'ui.queryBuilder.min',
			defaultMessage: 'Min',
			description: 'The hint text of the empty lower bound of a "between" condition of a filter.',
		},
		max: {
			id: 'ui.queryBuilder.max',
			defaultMessage: 'Max',
			description: 'The hint text of the empty upper bound of a "between" condition of a filter.',
		},
		fieldValue: {
			id: 'ui.queryBuilder.fieldValue',
			defaultMessage: '{field} value',
			description:
				'The name of the value field of a filter condition. The field is the name of the field of the condition.',
		},
		fieldMin: {
			id: 'ui.queryBuilder.fieldMin',
			defaultMessage: '{field} minimum',
			description:
				'The name of the lower bound of a "between" condition of a filter. The field is the name of its field.',
		},
		fieldMax: {
			id: 'ui.queryBuilder.fieldMax',
			defaultMessage: '{field} maximum',
			description:
				'The name of the upper bound of a "between" condition of a filter. The field is the name of its field.',
		},
	})
