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
import {
	type ComponentProps,
	Fragment,
	type ReactElement,
	type ReactNode,
	useId,
	useState,
} from 'react'
import type { ReorderMove } from '../../hooks/use-keyboard-reorder'
import { Glyph } from '../../primitives/glyph'
import { reorderMessages } from '../../primitives/intl/intl-reorder'
import type { IntlShape } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import type { Orientation } from '../../types/orientation'
import { Button } from '../button'
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
	/**
	 * The label of one disabled item that the menu shows when no section has an
	 * item, such as "No move". Without it, such a menu opens empty.
	 */
	empty?: string
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
export function MenuMove({ read, empty, children }: MenuMoveProps) {
	// The sections when the menu opened, or `null` while it is closed.
	const [sections, setSections] = useState<MenuMoveItem[][] | null>(null)

	const filled = sections?.filter((section) => section.length > 0) ?? []

	return (
		<Menu placement="bottom-end" onOpenChange={(open) => setSections(open ? read() : null)}>
			<MenuTrigger>{children}</MenuTrigger>
			<MenuContent>
				{sections !== null && filled.length === 0 && empty !== undefined && (
					<MenuItem disabled>
						<MenuLabel>{empty}</MenuLabel>
					</MenuItem>
				)}
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

/** Props for {@link MenuMoveButton}. The `<button>` takes the rest. @internal */
type MenuMoveButtonProps = Omit<ComponentProps<'button'>, 'type' | 'color' | 'slot'> & {
	/** The `data-slot` of the button, which the tests and the recipe select. */
	slot: string
	/** The id of the element whose name follows "Move" in the name of the button. */
	nameId: string | undefined
	/** Renders an inert button with no menu, which keeps the box of the item. */
	still: boolean
	/** Reads the items of the menu when it opens ({@link MenuMove}). */
	read: () => MenuMoveItem[][]
	/** The label of the disabled item of a menu with no item ({@link MenuMove}). */
	empty?: string
	/** Replaces the name of the button: "Move", and then the name of the item. */
	'aria-label'?: string
	/** Content of the button. */
	children: ReactNode
}

/**
 * The button of the move menu of an item. Its name is "Move", and then the
 * name of the item. The word "Move" sits in a hidden span that only the name of
 * the button reads, so it adds nothing to the name of the item. An explicit
 * `aria-label` replaces both.
 *
 * A `still` button is inert and opens no menu, so a disabled list or a drag
 * copy keeps the box of the item.
 *
 * @internal
 */
export function MenuMoveButton({
	slot,
	nameId,
	still,
	read,
	empty,
	'aria-label': ariaLabel,
	children,
	...props
}: MenuMoveButtonProps) {
	const intl = useIntl()

	const labelId = useId()

	if (still) {
		return (
			<Button
				variant="bare"
				{...props}
				type="button"
				data-slot={slot}
				aria-hidden="true"
				tabIndex={-1}
				inert
			>
				{children}
			</Button>
		)
	}

	return (
		<MenuMove read={read} empty={empty}>
			<Button
				variant="bare"
				{...props}
				type="button"
				// The tests and the recipe select the button by this slot, so it comes after the spread.
				data-slot={slot}
				aria-label={ariaLabel}
				aria-labelledby={
					props['aria-labelledby'] ?? (ariaLabel ? undefined : `${labelId} ${nameId}`)
				}
			>
				{ariaLabel ? null : (
					<span id={labelId} hidden>
						{intl.formatMessage(reorderMessages.move)}
					</span>
				)}
				{children}
			</Button>
		</MenuMove>
	)
}
