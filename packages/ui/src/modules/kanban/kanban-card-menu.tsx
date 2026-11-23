'use client'

import { type ComponentProps, useId, useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { EllipsisVertical } from '../../primitives/icons/icons'
import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageSet } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import { type KanbanCardMoves, useKanbanCardContext, useKanbanContext } from './context'

/** The values that each message of the menu takes. */
type KanbanMenuValues = {
	move: Record<never, never>
	moveUp: Record<never, never>
	moveDown: Record<never, never>
	moveTo: { column: string }
	column: { position: number }
	noMove: Record<never, never>
}

const messages: MessageSet<KanbanMenuValues> = defineMessages<KanbanMenuValues>({
	move: {
		id: 'ui.kanban.move',
		defaultMessage: 'Move',
		description:
			'The first word of the name of the button that opens the move menu of a Kanban card. The name of the card follows it.',
	},
	moveUp: {
		id: 'ui.kanban.moveUp',
		defaultMessage: 'Move up',
		description: 'The menu item that moves a Kanban card one place up in its column.',
	},
	moveDown: {
		id: 'ui.kanban.moveDown',
		defaultMessage: 'Move down',
		description: 'The menu item that moves a Kanban card one place down in its column.',
	},
	moveTo: {
		id: 'ui.kanban.moveTo',
		defaultMessage: 'Move to “{column}”',
		description: 'The menu item that moves a Kanban card to the end of another column.',
	},
	column: {
		id: 'ui.kanban.column',
		defaultMessage: 'Column {position, number}',
		description:
			'The name of a Kanban column that has no name of its own, in the move menu of a card, such as "Column 2".',
	},
	noMove: {
		id: 'ui.kanban.noMove',
		defaultMessage: 'No move',
		description:
			'The disabled item of the move menu of a Kanban card when the card has no place to move to.',
	},
})

/** Props for {@link KanbanCardMenu}. The `<button>` that opens the menu takes the rest. */
export type KanbanCardMenuProps = Omit<ComponentProps<'button'>, 'type' | 'color'> & {
	/**
	 * Replaces the accessible name of the button. By default the name is "Move",
	 * followed by the name of the card.
	 * @defaultValue `'Move'`, in the language of the reader.
	 */
	'aria-label'?: string
	/** Content of the button. @defaultValue an ellipsis icon. */
	children?: ComponentProps<'button'>['children']
}

/**
 * The "Move to" menu of a {@link KanbanCard}: a path that moves the card with
 * one pointer and no drag (WCAG 2.2 SC 2.5.7). The menu offers "Move up" and
 * "Move down" in the column, and "Move to" for each other column, which puts
 * the card at the end of that column.
 *
 * @remarks
 * Client component. Put it in a card, beside the {@link KanbanCardHandle}. A
 * move from the menu goes through `onReorder`, and the live region announces it
 * as a keyboard step does. The focus then goes to the handle of the card. On a
 * board with no `onReorder`, the menu renders nothing. A disabled board keeps
 * an inert button with no menu, so the cards keep their size. A column with no name
 * takes its position in the menu, such as "Column 2". A card with no place to
 * move to shows one disabled "No move" item.
 */
export function KanbanCardMenu({
	'aria-label': ariaLabel,
	children,
	className,
	...props
}: KanbanCardMenuProps) {
	const intl = useIntl()

	const { interactive, disabled, cardMoves, moveCard } = useKanbanContext()

	const card = useKanbanCardContext()

	// The word "Move" sits in a hidden span that only the name of the button reads,
	// so it adds nothing to the names of the other controls of the card.
	const labelId = useId()

	// The moves of the card when the menu opened. The menu reads the board then,
	// so a closed menu renders no item.
	const [moves, setMoves] = useState<KanbanCardMoves | null>(null)

	const content = children ?? <Icon icon={<EllipsisVertical />} size="sm" />

	// The drag overlay has no card context. It copies the button with no menu, so
	// the clone keeps the box of the card. A disabled board keeps the same inert
	// button, as it keeps a muted grip, so the cards do not change size.
	if (!card || disabled) {
		return (
			<Button
				variant="bare"
				{...props}
				type="button"
				data-slot="kanban-card-menu"
				aria-hidden="true"
				tabIndex={-1}
				inert
				className={className}
			>
				{content}
			</Button>
		)
	}

	if (!interactive) return null

	const { cardId, itemId } = card

	const columnLabel = (column: KanbanCardMoves['columns'][number]) =>
		column.name || intl.formatMessage(messages.column, { position: column.position })

	const none = moves !== null && !moves.up && !moves.down && moves.columns.length === 0

	const handleOpenChange = (open: boolean) => setMoves(open ? cardMoves(cardId) : null)

	return (
		<Menu placement="bottom-end" onOpenChange={handleOpenChange}>
			<MenuTrigger>
				<Button
					variant="bare"
					{...props}
					type="button"
					// The tests and the card select the button by this slot, so it comes after the spread.
					data-slot="kanban-card-menu"
					// "Move" and then the name of the card item. An explicit name replaces both.
					aria-label={ariaLabel}
					aria-labelledby={
						props['aria-labelledby'] ?? (ariaLabel ? undefined : `${labelId} ${itemId}`)
					}
					className={className}
				>
					{ariaLabel ? null : (
						<span id={labelId} hidden>
							{intl.formatMessage(messages.move)}
						</span>
					)}
					{content}
				</Button>
			</MenuTrigger>
			<MenuContent>
				{none && (
					<MenuItem disabled>
						<MenuLabel>{intl.formatMessage(messages.noMove)}</MenuLabel>
					</MenuItem>
				)}
				{moves?.up && (
					<MenuItem onAction={() => moveCard(cardId, { direction: -1 }, moves.cardName)}>
						<MenuLabel>{intl.formatMessage(messages.moveUp)}</MenuLabel>
					</MenuItem>
				)}
				{moves?.down && (
					<MenuItem onAction={() => moveCard(cardId, { direction: 1 }, moves.cardName)}>
						<MenuLabel>{intl.formatMessage(messages.moveDown)}</MenuLabel>
					</MenuItem>
				)}
				{moves?.columns.map((column) => (
					<MenuItem
						key={column.id}
						onAction={() => moveCard(cardId, { columnId: column.id }, moves.cardName)}
					>
						<MenuLabel>
							{intl.formatMessage(messages.moveTo, { column: columnLabel(column) })}
						</MenuLabel>
					</MenuItem>
				))}
			</MenuContent>
		</Menu>
	)
}
