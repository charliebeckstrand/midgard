'use client'

import { EllipsisVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from 'ui/button'
import { type ContextMenuEntry, ContextMenuList } from 'ui/context-menu'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuTrigger } from 'ui/menu'

/** Props for {@link PlaceMenu}. */
export type PlaceMenuProps = {
	/** The rows, from `placeMenuItems` or `visitMenuItems`. */
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
					<Button type="button" variant="bare" aria-label={ariaLabel}>
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
