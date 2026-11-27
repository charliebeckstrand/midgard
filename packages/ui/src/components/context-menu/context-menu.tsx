'use client'

import { type ReactNode, useMemo } from 'react'
import { Menu, MenuContent } from '../menu'
import { ContextMenuList } from './context-menu-list'
import { resolveContextMenuEntries } from './context-menu-merge'
import type { ContextMenuConfig, ContextMenuEntry } from './types'

/** Props for {@link ContextMenu}. */
export type ContextMenuProps = ContextMenuConfig & {
	/**
	 * The host's built-in entries, shown unless `defaultItems` is off. An entry is
	 * an item, a separator, or a submenu ({@link ContextMenuEntry}). A consumer
	 * embedding a bare menu leaves this empty and supplies `items`.
	 * @defaultValue []
	 */
	defaults?: ContextMenuEntry[]
	/**
	 * Suppresses the menu, so that a right-click opens the browser's native menu.
	 * @defaultValue false
	 */
	disabled?: boolean
	/**
	 * Accessible name for the menu. A context menu has no trigger to name it, so
	 * give it a name such as "Row actions".
	 */
	'aria-label'?: string
	/**
	 * Classes for the wrapper. The wrapper has `display: contents` and no box, so
	 * only an inherited property, such as `color`, reaches the content. The
	 * wrapper keeps the classes when the menu turns off.
	 */
	className?: string
	/**
	 * The content a right-click within opens the menu over. A keyboard opens the
	 * menu from a focused element in the content, so the content must hold a
	 * focusable element. Content with no control takes `tabIndex={0}`, a role,
	 * and a name.
	 */
	children: ReactNode
}

/**
 * A menu that opens on a right-click of its content. Its items are the
 * `defaults` of a host, merged with the custom {@link ContextMenuConfig} of a
 * caller. The custom items sit before or after the defaults per `insert`, with
 * a separator between when both show. With nothing to show (no defaults kept
 * and no custom items, or `disabled`) it opens no menu, so the native menu
 * still opens. The wrapper stays in both states, so the content keeps its state
 * when the menu turns on or off. Both lists take each {@link ContextMenuEntry}
 * kind: an item, a separator, or a submenu that opens a nested menu.
 *
 * A keyboard opens the menu with the ContextMenu key or Shift+F10. The browser
 * then fires `contextmenu` at the focused element, so the menu opens only from a
 * focused element in the content. Content with no control, such as an image,
 * must take `tabIndex={0}`, a role such as `group`, and an `aria-label`.
 * Otherwise an action that only the menu holds has no keyboard route (WCAG
 * 2.1.1). ContextMenu does not make its content focusable, because that adds a
 * Tab stop to each caller.
 *
 * @remarks Anchors at the cursor and tracks the right-clicked element on scroll,
 * the shared `Menu` right-click behavior. The menu is a floating overlay that
 * dismisses on outside press or `Escape`.
 * @see {@link ContextMenuList} to render entries inside a bespoke right-click surface.
 */
export function ContextMenu({
	defaults,
	items,
	defaultItems,
	insert,
	capped,
	disabled = false,
	'aria-label': ariaLabel,
	className,
	children,
}: ContextMenuProps) {
	const entries = useMemo(
		() => resolveContextMenuEntries({ items, defaultItems, insert }, defaults ?? []),
		[items, defaultItems, insert, defaults],
	)

	// The menu turns off inside the wrapper. A bare return would change the
	// parent of the content, and React would then mount the content again.
	const off = disabled || entries.length === 0

	return (
		<Menu className={className} capped={capped} disabled={off}>
			{children}

			<MenuContent aria-label={ariaLabel}>
				<ContextMenuList entries={entries} />
			</MenuContent>
		</Menu>
	)
}
