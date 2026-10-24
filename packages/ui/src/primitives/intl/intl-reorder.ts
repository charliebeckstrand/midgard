import { defineMessages } from './intl-messages'
import type { IntlShape, MessageSet } from './types'

// The values of a message that names an item at its place.
type SlotValues = { item: string; position: number; total: number }

// The values of a message that names an item at its place in a named group.
type ContainerValues = SlotValues & { container: string }

// The values of each reorder message, by key.
type ReorderValues = {
	subject: SlotValues
	subjectIn: ContainerValues
	pickedUp: { subject: string }
	dropped: { subject: string }
	moved: SlotValues
	movedIn: ContainerValues
	returned: SlotValues
	returnedIn: ContainerValues
	returnedBare: { item: string }
	liftHint: Record<never, never>
	liftInstructions: Record<never, never>
	sensorInstructions: Record<never, never>
	reorderHandle: { item: string }
	moveHandle: { item: string }
	unnamedItem: Record<never, never>
	sortableRole: Record<never, never>
	draggableRole: Record<never, never>
}

/**
 * The messages of a reorder. They hold the live-region text of a pick-up, a
 * move, a drop, and a return. They also hold the instructions of the keyboard
 * and the names of the reorder handles. A list, a query builder, a Kanban, and a grid use
 * them, for a pointer drag and for the keyboard. The handle of a dnd-kit item
 * speaks its role with `sortableRole` or `draggableRole`, in place of the
 * English role of dnd-kit.
 *
 * @internal
 */
export const reorderMessages: MessageSet<ReorderValues> = defineMessages<ReorderValues>({
	subject: {
		id: 'ui.reorder.subject',
		defaultMessage: '{item}, position {position, number} of {total, number}',
		description:
			'An item and its place in an ordered list, inside a reorder announcement, such as "Alpha, position 2 of 3".',
	},
	subjectIn: {
		id: 'ui.reorder.subjectIn',
		defaultMessage: '{item}, position {position, number} of {total, number} in {container}',
		description:
			'An item and its place in a named group, such as a card in a Kanban column, inside a reorder announcement.',
	},
	pickedUp: {
		id: 'ui.reorder.pickedUp',
		defaultMessage: 'Picked up {subject}.',
		description:
			'Spoken when the reader picks up an item to move it. The subject is the item, with its place when it has one.',
	},
	dropped: {
		id: 'ui.reorder.dropped',
		defaultMessage: 'Dropped {subject}.',
		description:
			'Spoken when the reader drops a moved item. The subject is the item, with its place when it has one.',
	},
	moved: {
		id: 'ui.reorder.moved',
		defaultMessage: '{item} moved to position {position, number} of {total, number}.',
		description: 'Spoken when an item moves to a new place in an ordered list.',
	},
	movedIn: {
		id: 'ui.reorder.movedIn',
		defaultMessage:
			'{item} moved to position {position, number} of {total, number} in {container}.',
		description:
			'Spoken when an item moves to a new place in a named group, such as a Kanban column.',
	},
	returned: {
		id: 'ui.reorder.returned',
		defaultMessage: 'Returned {item} to position {position, number} of {total, number}.',
		description: 'Spoken when a canceled move puts an item back at its place in an ordered list.',
	},
	returnedIn: {
		id: 'ui.reorder.returnedIn',
		defaultMessage:
			'Returned {item} to position {position, number} of {total, number} in {container}.',
		description: 'Spoken when a canceled move puts an item back at its place in a named group.',
	},
	returnedBare: {
		id: 'ui.reorder.returnedBare',
		defaultMessage: 'Returned {item}.',
		description: 'Spoken when a canceled move puts back an item whose place is not known.',
	},
	liftHint: {
		id: 'ui.reorder.liftHint',
		defaultMessage: 'Use the arrow keys to move it, then press Space or Enter to drop it.',
		description: 'Spoken after the pick-up of an item with the keyboard.',
	},
	liftInstructions: {
		id: 'ui.reorder.liftInstructions',
		defaultMessage:
			'To pick up an item, press Space. Use the arrow keys to move it, then press Space or Enter to drop it.',
		description:
			'The description of a reorder handle whose keyboard lifts an item with Space and drops it with Space or Enter.',
	},
	sensorInstructions: {
		id: 'ui.reorder.sensorInstructions',
		defaultMessage:
			'To pick up an item, press Space. Use the arrow keys to move it, then press Space to drop it, or Escape to cancel.',
		description:
			'The description of a drag handle whose keyboard drops an item with Space and cancels the move with Escape.',
	},
	reorderHandle: {
		id: 'ui.reorder.reorderHandle',
		defaultMessage: 'Reorder {item}',
		description: 'The name of the handle that drags an item to a new place in a list.',
	},
	moveHandle: {
		id: 'ui.reorder.moveHandle',
		defaultMessage: 'Move {item}',
		description:
			'The name of a control that moves an item, such as the drag handle of a dashboard tile.',
	},
	unnamedItem: {
		id: 'ui.reorder.unnamedItem',
		defaultMessage: 'the item',
		description: 'The name of an item in a reorder announcement when the item has no name.',
	},
	sortableRole: {
		id: 'ui.reorder.sortableRole',
		defaultMessage: 'sortable',
		description:
			'The role that a screen reader speaks after the name of a handle that moves an item to a new place in a list, such as "Reorder Alpha, sortable". Lowercase.',
	},
	draggableRole: {
		id: 'ui.reorder.draggableRole',
		defaultMessage: 'draggable',
		description:
			'The role that a screen reader speaks after the name of a handle that drags an item, such as "Move Revenue, draggable". Lowercase.',
	},
})

/**
 * The place of an item: its 1-based `position`, the `total` of its list, and
 * the name of the group that holds it. An example group is the column of a
 * Kanban card. An empty `container` counts as no group.
 *
 * @internal
 */
export type ReorderSlot = { position: number; total: number; container?: string }

// The values of a message that names an item at a slot.
const slotValues = (item: string, { position, total }: ReorderSlot) => ({ item, position, total })

/**
 * The item and its place, as an announcement names them, such as
 * "Alpha, position 2 of 3 in Todo". With no slot, it is the item alone.
 *
 * @internal
 */
export function reorderSubject(intl: IntlShape, item: string, slot?: ReorderSlot | null): string {
	if (!slot) return item

	return slot.container
		? intl.formatMessage(reorderMessages.subjectIn, {
				...slotValues(item, slot),
				container: slot.container,
			})
		: intl.formatMessage(reorderMessages.subject, slotValues(item, slot))
}

/**
 * The text of a pick-up, such as "Picked up Alpha, position 2 of 3.".
 *
 * @internal
 */
export function pickedUpText(intl: IntlShape, item: string, slot?: ReorderSlot | null): string {
	return intl.formatMessage(reorderMessages.pickedUp, { subject: reorderSubject(intl, item, slot) })
}

/**
 * The text of a drop, such as "Dropped Alpha, position 2 of 3.".
 *
 * @internal
 */
export function droppedText(intl: IntlShape, item: string, slot?: ReorderSlot | null): string {
	return intl.formatMessage(reorderMessages.dropped, { subject: reorderSubject(intl, item, slot) })
}

/**
 * The text of a move to `slot`, such as "Alpha moved to position 3 of 3.".
 *
 * @internal
 */
export function movedText(intl: IntlShape, item: string, slot: ReorderSlot): string {
	return slot.container
		? intl.formatMessage(reorderMessages.movedIn, {
				...slotValues(item, slot),
				container: slot.container,
			})
		: intl.formatMessage(reorderMessages.moved, slotValues(item, slot))
}

/**
 * The text of a cancel that puts an item back at `slot`, such as
 * "Returned Alpha to position 1 of 3.". With no slot, it names the item alone.
 *
 * @internal
 */
export function returnedText(intl: IntlShape, item: string, slot?: ReorderSlot | null): string {
	if (!slot) return intl.formatMessage(reorderMessages.returnedBare, { item })

	return slot.container
		? intl.formatMessage(reorderMessages.returnedIn, {
				...slotValues(item, slot),
				container: slot.container,
			})
		: intl.formatMessage(reorderMessages.returned, slotValues(item, slot))
}
