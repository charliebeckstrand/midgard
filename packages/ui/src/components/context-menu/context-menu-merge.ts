import type { ContextMenuConfig, ContextMenuEntry } from './types'

/**
 * Joins groups of entries with a separator between each pair. It removes the
 * separators at the start and the end of each group, and then skips each empty
 * group. Thus no menu opens on a leading, trailing, or doubled rule at a group
 * edge. A separator between two entries of one group stays.
 * The building block a host uses to set its own default groups apart — a
 * column's sort actions from the table-wide tools below them.
 *
 * @param groups - Entry groups in render order. A group that holds only
 * separators counts as empty.
 * @returns The groups concatenated, one separator between each surviving pair.
 */
export function mergeContextMenuItems(groups: ContextMenuEntry[][]): ContextMenuEntry[] {
	return joinGroups(groups, (index) => `context-menu-group-${index}`)
}

/**
 * Trims the groups, skips each empty group, and puts a separator with the key
 * that `separatorKey` gives between each pair. A slice keeps each entry, so an
 * entry keeps its identity.
 */
function joinGroups(
	groups: ContextMenuEntry[][],
	separatorKey: (index: number) => string,
): ContextMenuEntry[] {
	const kept = groups.map(trimSeparators).filter((group) => group.length > 0)

	return kept.flatMap((group, index) =>
		index === 0 ? group : [{ key: separatorKey(index), separator: true }, ...group],
	)
}

/**
 * The group without the separators at its start and its end. A group that
 * holds only separators becomes empty.
 */
function trimSeparators(group: ContextMenuEntry[]): ContextMenuEntry[] {
	const isRow = (entry: ContextMenuEntry) => !('separator' in entry)

	const start = group.findIndex(isRow)

	return start === -1 ? [] : group.slice(start, group.findLastIndex(isRow) + 1)
}

/**
 * Resolves a host's {@link ContextMenuConfig} against the default items it
 * supplies, ordered by `insert`. The result holds the custom items in array
 * order, the defaults when `defaultItems` is on, and a separator between the
 * groups when both show. Either group empty, no separator renders; both empty,
 * the result is empty and the host leaves the native menu alone. As in
 * {@link mergeContextMenuItems}, the separators at the start and the end of
 * each group go, and a group that holds only separators counts as empty. Thus
 * no rule leads, trails, or doubles at the join.
 *
 * @param config - The caller's configuration, or `undefined` for all defaults.
 * @param defaults - The host's built-in entries: items, separators, and submenus.
 * @returns The final entries to render, in order.
 */
export function resolveContextMenuEntries(
	config: ContextMenuConfig | undefined,
	defaults: ContextMenuEntry[],
): ContextMenuEntry[] {
	const custom = config?.items ?? []

	const shownDefaults = (config?.defaultItems ?? true) ? defaults : []

	const [first, second] =
		(config?.insert ?? 'after') === 'before' ? [custom, shownDefaults] : [shownDefaults, custom]

	// The separator has a key of its own. A host can build its `defaults` through
	// `mergeContextMenuItems`, and a key from that function here would give two
	// rows the same React key.
	return joinGroups([first, second], () => 'context-menu-insert')
}
