'use client'

import { ArrowLeftRight, ArrowUpDown } from 'lucide-react'
import { type ComponentProps, useId } from 'react'
import { accessibleName } from '../../core/accessible-name'
import { cn } from '../../core/cn'
import { isRtl } from '../../hooks/a11y/logical-arrow'
import { reorderMessages } from '../../primitives/intl/intl-reorder'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/list'
import { Button } from '../button'
import { Icon } from '../icon'
import { MenuMove, placeMoveItems } from '../menu/menu-move'
import { useListContext, useListItemContext } from './context'

/** Props for {@link ListItemMenu}. The `<button>` that opens the menu takes the rest. */
export type ListItemMenuProps = Omit<ComponentProps<'button'>, 'type' | 'color'> & {
	/**
	 * Replaces the accessible name of the button. By default the name is "Move",
	 * followed by the name of the row.
	 * @defaultValue `'Move'` and the name of the row, in the language of the reader.
	 */
	'aria-label'?: string
	/** Content of the button. @defaultValue an up-down arrow icon, or a left-right one in a horizontal list. */
	children?: ComponentProps<'button'>['children']
}

/**
 * The move menu of a sortable {@link ListItem}: a path that moves the row with
 * one pointer and no drag (WCAG 2.2 SC 2.5.7). A vertical list offers "Move
 * up", "Move down", "Move to top", and "Move to bottom". A horizontal list
 * offers "Move left", "Move right", "Move to start", and "Move to end". The
 * menu offers only the moves that change the place of the row.
 *
 * @remarks
 * Client component. A list with `onReorder` inserts one at the end of each row,
 * after the `suffix`. Under `handle={false}`, place one in each item yourself,
 * such as in its `suffix`. A move from the menu goes through `onReorder`, and
 * the live region announces it as a keyboard step does. The focus then goes
 * back to the button, which moves with its row. The menu renders nothing in a
 * read-only list and in a single-item list, as the {@link ListHandle} does. A
 * disabled list keeps an inert button with no menu, so the rows keep their
 * size. In a locked scope, such as a `Form` while a submit runs, an item of the
 * menu moves nothing.
 */
export function ListItemMenu({
	'aria-label': ariaLabel,
	children,
	className,
	...props
}: ListItemMenuProps) {
	const intl = useIntl()

	const { interactive, disabled, itemCount, orientation, menuMoves, menuMove } = useListContext()

	const { id, rowId } = useListItemContext()

	// The word "Move" sits in a hidden span that only the name of the button reads,
	// so it adds nothing to the name of the row.
	const labelId = useId()

	// A list that cannot reorder shows no menu. A disabled list keeps an inert one.
	if (itemCount <= 1 || (!interactive && !disabled)) return null

	const content = children ?? (
		<Icon icon={orientation === 'horizontal' ? ArrowLeftRight : ArrowUpDown} />
	)

	const look = cn(k().menu, className)

	if (disabled) {
		return (
			<Button
				variant="bare"
				{...props}
				type="button"
				data-slot="list-item-menu"
				aria-hidden="true"
				tabIndex={-1}
				inert
				className={look}
			>
				{content}
			</Button>
		)
	}

	// The menu reads the row when it opens, before its items sit in the row.
	const read = () => {
		const row = rowId === undefined ? null : document.getElementById(rowId)

		const name = accessibleName(row)

		return [
			placeMoveItems(intl, menuMoves(id), { orientation, rtl: isRtl(row) }, (move) =>
				menuMove(id, move, name),
			),
		]
	}

	return (
		<MenuMove read={read}>
			<Button
				variant="bare"
				{...props}
				type="button"
				// The tests and the recipe select the button by this slot, so it comes after the spread.
				data-slot="list-item-menu"
				// "Move" and then the name of the row. An explicit name replaces both.
				aria-label={ariaLabel}
				aria-labelledby={
					props['aria-labelledby'] ?? (ariaLabel ? undefined : `${labelId} ${rowId}`)
				}
				className={look}
			>
				{ariaLabel ? null : (
					<span id={labelId} hidden>
						{intl.formatMessage(reorderMessages.move)}
					</span>
				)}
				{content}
			</Button>
		</MenuMove>
	)
}
