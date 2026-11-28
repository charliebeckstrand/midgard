'use client'

import {
	ArrowDown,
	ArrowLeftToLine,
	ArrowRightToLine,
	ArrowUp,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
} from 'lucide-react'
import { Fragment, type ReactElement, useState } from 'react'
import type { ReorderMove } from '../../hooks/use-keyboard-reorder'
import { Glyph } from '../../primitives/glyph'
import { reorderMessages } from '../../primitives/intl/intl-reorder'
import type { IntlShape } from '../../primitives/intl/types'
import type { Orientation } from '../../types/orientation'
import { Icon } from '../icon'
import { Menu } from './menu'
import { MenuContent } from './menu-content'
import { MenuItem } from './menu-item'
import { MenuTrigger } from './menu-trigger'
import { MenuLabel, MenuSeparator } from './slots'

/** One item of a {@link MenuMove}. @internal */
export type MenuMoveItem = {
	key: string
	label: string
	icon: ReactElement
	onAction: () => void
}

/** The label and the glyph of each move of a vertical list. A chevron moves one place, and an arrow moves to an end. */
const VERTICAL = {
	previous: { label: reorderMessages.moveUp, icon: <Glyph icon={ChevronUp} /> },
	next: { label: reorderMessages.moveDown, icon: <Glyph icon={ChevronDown} /> },
	first: { label: reorderMessages.moveToTop, icon: <Glyph icon={ArrowUp} /> },
	last: { label: reorderMessages.moveToBottom, icon: <Glyph icon={ArrowDown} /> },
} as const

/** The moves of a horizontal list that name the physical side, by the reading direction. */
const left = { label: reorderMessages.moveLeft, icon: <Glyph icon={ChevronLeft} /> }

const right = { label: reorderMessages.moveRight, icon: <Glyph icon={ChevronRight} /> }

/**
 * The label and the glyph of each move of a horizontal list. "Move left" and
 * "Move right" name the physical side, as the column menu of a grid does, so in
 * a right-to-left layout the move to the previous place reads "Move right".
 */
const horizontal = (rtl: boolean) => ({
	previous: rtl ? right : left,
	next: rtl ? left : right,
	first: {
		label: reorderMessages.moveToStart,
		icon: <Glyph icon={rtl ? ArrowRightToLine : ArrowLeftToLine} />,
	},
	last: {
		label: reorderMessages.moveToEnd,
		icon: <Glyph icon={rtl ? ArrowLeftToLine : ArrowRightToLine} />,
	},
})

/**
 * The items of the place moves of an item, in menu order: one for each move
 * in `moves`. A vertical list offers "Move up", "Move down", "Move to top",
 * and "Move to bottom". A horizontal list offers "Move left", "Move right",
 * "Move to start", and "Move to end".
 *
 * @param run - Commits a move.
 * @internal
 */
export function placeMoveItems(
	intl: IntlShape,
	moves: readonly ReorderMove[],
	{ orientation, rtl }: { orientation: Orientation; rtl: boolean },
	run: (move: ReorderMove) => void,
): MenuMoveItem[] {
	const choices = orientation === 'horizontal' ? horizontal(rtl) : VERTICAL

	return moves.map((move) => ({
		key: move,
		label: intl.formatMessage(choices[move].label),
		icon: choices[move].icon,
		onAction: () => run(move),
	}))
}

/** Props for {@link MenuMove}. @internal */
type MenuMoveProps = {
	/**
	 * Reads the items of the menu when it opens, in sections. A separator
	 * divides two sections that both have items.
	 */
	read: () => MenuMoveItem[][]
	/** The trigger button. It carries the name of the menu, such as "Move Alpha". */
	children: ReactElement
}

/**
 * The move menu of an item of a list that reorders: the single-pointer path of
 * the drag of the item (WCAG 2.2 SC 2.5.7). The menu reads its items when it
 * opens, so a closed menu renders no item and reads no state of the list.
 *
 * @internal
 */
export function MenuMove({ read, children }: MenuMoveProps) {
	const [sections, setSections] = useState<MenuMoveItem[][]>([])

	const filled = sections.filter((section) => section.length > 0)

	return (
		<Menu placement="bottom-end" onOpenChange={(open) => setSections(open ? read() : [])}>
			<MenuTrigger>{children}</MenuTrigger>
			<MenuContent>
				{filled.map((section, index) => (
					<Fragment key={section[0]?.key}>
						{index > 0 && <MenuSeparator />}
						{section.map((item) => (
							<MenuItem key={item.key} onAction={item.onAction}>
								<Icon icon={item.icon} />
								<MenuLabel>{item.label}</MenuLabel>
							</MenuItem>
						))}
					</Fragment>
				))}
			</MenuContent>
		</Menu>
	)
}
