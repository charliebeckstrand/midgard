'use client'

import { type ReactElement, useState } from 'react'
import { Icon } from '../../components/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp } from '../../primitives/icons/icons'
import { useIntl } from '../../primitives/intl/use-intl'
import { gridMessages } from './engine/grid-messages'
import type { GridItemMoves, GridMoveTarget } from './engine/grid-reorder-move'

/** The moves that a manager offers for an item, in menu order. @internal */
const MANAGER_MOVES: readonly GridMoveTarget[] = ['previous', 'next', 'first', 'last']

/**
 * The label and the glyph of each manager move. A manager list runs from top
 * to bottom. A chevron moves one place, and an arrow moves to the end.
 *
 * @internal
 */
const MANAGER_MOVE_ITEMS = {
	previous: { label: gridMessages.moveUp, icon: <ChevronUp /> },
	next: { label: gridMessages.moveDown, icon: <ChevronDown /> },
	first: { label: gridMessages.moveToTop, icon: <ArrowUp /> },
	last: { label: gridMessages.moveToBottom, icon: <ArrowDown /> },
} as const

/** Props for {@link GridManagerMoveMenu}. @internal */
type GridManagerMoveMenuProps = {
	/** The key of the item, as the moves read it. */
	itemKey: string
	/** The menu moves of the list that holds the item. */
	moves: GridItemMoves
	/** The trigger button. It carries the name of the menu, such as "Move Name". */
	children: ReactElement
}

/**
 * The move menu of one row of a manager list: "Move up", "Move down", "Move
 * to top", and "Move to bottom". It is the single-pointer path of the drag
 * grip of the row (WCAG 2.5.7). A move commits through the callback that a
 * drop calls, and the live region announces the new place. The menu reads the
 * moves when it opens, and it offers only the moves that change the place of
 * the item. The column manager and the row manager share it.
 *
 * @internal
 */
export function GridManagerMoveMenu({ itemKey, moves, children }: GridManagerMoveMenuProps) {
	const intl = useIntl()

	const [targets, setTargets] = useState<GridMoveTarget[]>([])

	return (
		<Menu
			placement="bottom-end"
			onOpenChange={(open) => setTargets(open ? moves.targets(itemKey, MANAGER_MOVES) : [])}
		>
			<MenuTrigger>{children}</MenuTrigger>
			<MenuContent>
				{targets.map((target) => (
					<MenuItem key={target} onAction={() => moves.move(itemKey, target)}>
						<Icon icon={MANAGER_MOVE_ITEMS[target].icon} />
						<MenuLabel>{intl.formatMessage(MANAGER_MOVE_ITEMS[target].label)}</MenuLabel>
					</MenuItem>
				))}
			</MenuContent>
		</Menu>
	)
}
