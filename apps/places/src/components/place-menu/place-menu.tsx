'use client'

import { CalendarPlus, EllipsisVertical, Pencil, Trash } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from 'ui/button'
import { type ContextMenuEntry, ContextMenuList } from 'ui/context-menu'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuTrigger } from 'ui/menu'
import type { Place, Visit } from '../../types'

/** What the menu of a place does. The caller opens the panels and asks for the confirmations. */
export type PlaceActions = {
	onAddVisit: (place: Place) => void
	onEdit: (place: Place) => void
	onDelete: (place: Place) => void
}

/** What the menu of one visit does. */
export type VisitActions = {
	onEditVisit: (place: Place, visit: Visit) => void
	onDeleteVisit: (place: Place, visit: Visit) => void
}

/** The rows of the menu of a place: Add visit, Edit place, and Delete place. */
export function placeMenuItems(place: Place, actions: PlaceActions): ContextMenuEntry[] {
	return [
		{
			key: 'visit',
			label: 'Add visit',
			icon: <CalendarPlus />,
			onAction: () => actions.onAddVisit(place),
		},
		{ key: 'edit', label: 'Edit place', icon: <Pencil />, onAction: () => actions.onEdit(place) },
		{
			key: 'delete',
			label: 'Delete place',
			icon: <Trash />,
			onAction: () => actions.onDelete(place),
		},
	]
}

/**
 * The rows of the menu of one visit: Edit visit and Delete visit. A place keeps
 * at least one visit, so the confirmation of a delete of the only visit says
 * that the place goes too.
 */
export function visitMenuItems(
	place: Place,
	visit: Visit,
	actions: VisitActions,
): ContextMenuEntry[] {
	return [
		{
			key: 'edit',
			label: 'Edit visit',
			icon: <Pencil />,
			onAction: () => actions.onEditVisit(place, visit),
		},
		{
			key: 'delete',
			label: 'Delete visit',
			icon: <Trash />,
			onAction: () => actions.onDeleteVisit(place, visit),
		},
	]
}

/** Props for {@link PlaceMenu}. */
export type PlaceMenuProps = {
	/** The rows, from {@link placeMenuItems} or {@link visitMenuItems}. */
	items: ContextMenuEntry[]
	/** The name of the menu, which also names the button. */
	'aria-label': string
	/**
	 * The content that a right-click or a long press opens the menu over. Without
	 * it, the menu opens from a vertical ellipsis button.
	 */
	children?: ReactNode
}

/**
 * The one menu of the app, over a place or one of its visits. It opens from a
 * vertical ellipsis button on a row of My places and in the place drawer, and
 * on a right-click or a long press of a place in the search. Every spot shows
 * the same rows, so the reader finds one action in one place.
 */
export function PlaceMenu({ items, 'aria-label': ariaLabel, children }: PlaceMenuProps) {
	return (
		// A placement makes the menu a dropdown from its trigger. Without one, the
		// menu opens over its content on a right-click or a long press.
		<Menu placement={children === undefined ? 'bottom-end' : undefined}>
			{children ?? (
				<MenuTrigger>
					<Button type="button" variant="plain" aria-label={ariaLabel}>
						<Icon icon={<EllipsisVertical />} />
					</Button>
				</MenuTrigger>
			)}

			<MenuContent aria-label={ariaLabel}>
				<ContextMenuList entries={items} />
			</MenuContent>
		</Menu>
	)
}
