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
	 * Suppress the menu, leaving the browser's native menu on a right-click.
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
	/** The content a right-click within opens the menu over. */
	children: ReactNode
}

/**
 * Wraps content in a right-click context menu built from a host's `defaults`
 * merged with a caller's custom {@link ContextMenuConfig}. The custom items sit
 * before or after the defaults per `insert`, with a separator between when
 * both show. With nothing to show — no defaults kept and no custom items, or
 * `disabled` — it opens no menu, so the native menu still opens. The wrapper
 * stays in both states, so the content keeps its state when the menu turns on
 * or off. Both lists take each {@link ContextMenuEntry} kind: an item, a
 * separator, or a submenu that opens a nested menu.
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
