'use client'

import { type ReactNode, useMemo } from 'react'
import { Menu, MenuContent } from '../menu'
import { ContextMenuList } from './context-menu-list'
import { resolveContextMenuEntries } from './context-menu-merge'
import type { ContextMenuConfig, ContextMenuItem } from './types'

/** Props for {@link ContextMenu}. */
export type ContextMenuProps = ContextMenuConfig & {
	/**
	 * The host's built-in items, shown unless `defaultItems` is off. A consumer
	 * embedding a bare menu leaves this empty and supplies `items`.
	 */
	defaults?: ContextMenuItem[]
	/**
	 * Suppress the menu, leaving the browser's native menu on a right-click.
	 * @defaultValue false
	 */
	disabled?: boolean
	className?: string
	/** The content a right-click within opens the menu over. */
	children: ReactNode
}

/**
 * Wraps content in a right-click context menu built from a host's `defaults`
 * merged with a caller's custom {@link ContextMenuConfig} — the custom items
 * before or after the defaults per `position`, a separator between when both
 * show. With nothing to show — no defaults kept and no custom items, or
 * `disabled` — it renders the content untouched, so the native menu still opens.
 *
 * @remarks Anchors at the cursor and tracks the right-clicked element on scroll,
 * the shared `Menu` right-click behaviour. The menu is a floating overlay that
 * dismisses on outside press or `Escape`.
 * @see {@link ContextMenuList} to render entries inside a bespoke right-click surface.
 */
export function ContextMenu({
	defaults,
	items,
	defaultItems,
	position,
	disabled = false,
	className,
	children,
}: ContextMenuProps) {
	const entries = useMemo(
		() => resolveContextMenuEntries({ items, defaultItems, position }, defaults ?? []),
		[items, defaultItems, position, defaults],
	)

	if (disabled || entries.length === 0) return <>{children}</>

	return (
		<Menu className={className}>
			{children}

			<MenuContent>
				<ContextMenuList entries={entries} />
			</MenuContent>
		</Menu>
	)
}
