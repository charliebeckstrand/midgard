import type { ReactElement, ReactNode } from 'react'

/**
 * One actionable entry in a {@link ContextMenu}: a label, an optional leading
 * icon, and the handler run when it is chosen. The menu closes after `onSelect`.
 * This is the public shape a host's default actions and a caller's custom items
 * share, so a chart's built-in "Fullscreen" and an app's own "View details"
 * read as one list.
 */
export type ContextMenuItem = {
	/**
	 * Stable identity for the entry, used as its React key. Falls back to the
	 * render index when omitted — enough for a static list, but set it on a list
	 * that reorders so React keeps each row's state.
	 */
	key?: string
	/** The entry's label. */
	label: ReactNode
	/** Leading icon element (e.g. a Lucide icon), rendered through `Icon`. */
	icon?: ReactElement
	/** Runs when the entry is chosen; the menu closes afterward. */
	onSelect: () => void
	/** Render the entry inert and dimmed. @defaultValue false */
	disabled?: boolean
}

/**
 * A divider between groups of {@link ContextMenuItem}s — the rule
 * {@link resolveContextMenuEntries} inserts between a host's defaults and a
 * caller's custom items, and that a host may place between its own groups.
 */
export type ContextMenuSeparator = {
	/** Stable identity for the separator, used as its React key. */
	key?: string
	separator: true
}

/** One rendered row of a context menu: an actionable {@link ContextMenuItem} or a {@link ContextMenuSeparator}. */
export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator

/** Where a caller's custom items sit relative to a host's default items. @see {@link ContextMenuConfig.position} */
export type ContextMenuPosition = 'before' | 'after'

/**
 * A host's right-click-menu configuration, exposed as a prop (a chart's
 * `contextMenu`, say): the custom `items` to add, whether to keep the host's
 * default items, and where the custom block sits relative to them. A separator
 * divides the two groups when both show.
 *
 * @see {@link resolveContextMenuEntries}
 */
export type ContextMenuConfig = {
	/** Custom entries to add to the menu, rendered in array order. */
	items?: ContextMenuItem[]
	/**
	 * Keep the host's built-in items. Turn off to show only the custom `items`.
	 * @defaultValue true
	 */
	defaultItems?: boolean
	/**
	 * Where the custom `items` sit relative to the default items: `'after'` them
	 * (the default) or `'before'` them.
	 * @defaultValue 'after'
	 */
	position?: ContextMenuPosition
}
