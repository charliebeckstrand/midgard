import type { ContextMenuConfig, ContextMenuEntry, ContextMenuSeparator } from './types'

/**
 * Joins groups of entries with a separator between each pair. It removes the
 * separators at the start and the end of each group, and then skips each empty
 * group. Thus no menu opens on a leading, trailing, or doubled rule at a group
 * edge. A separator between two entries of one group stays. A slice keeps
 * each entry, so an entry keeps its identity. The building block a host uses
 * to set its own default groups apart: a column's sort actions from the
 * table-wide tools below them.
 *
 * @remarks The key of an added separator comes from the key of the entry after
 * it. A trimmed group starts with a row, so each separator comes before a
 * different row. Thus two lists that this function merged can share one menu,
 * and a merge of those lists adds no repeated key. A separator before an entry
 * with no key has no key, and the render index stands in, as for that entry.
 *
 * @param groups - Entry groups in render order. A group that holds only
 * separators counts as empty.
 * @returns The groups concatenated, one separator between each surviving pair.
 */
export function mergeContextMenuItems(groups: ContextMenuEntry[][]): ContextMenuEntry[] {
	const kept = groups.map(trimSeparators).filter((group) => group.length > 0)

	return kept.flatMap((group, index) =>
		index === 0 ? group : [separatorBefore(group[0]), ...group],
	)
}

/** A separator, keyed by the entry that comes after it. */
function separatorBefore(next: ContextMenuEntry | undefined): ContextMenuSeparator {
	return next?.key === undefined
		? { separator: true }
		: { key: `${next.key}:separator`, separator: true }
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
 * A custom item or submenu with the key of a shown default item or submenu
 * replaces that default in its place ({@link replaceDefaults}). Thus a host
 * can give its own version of a default, and the menu shows one row for each
 * key.
 *
 * @param config - The caller's configuration, or `undefined` for all defaults.
 * @param defaults - The host's built-in entries: items, separators, and submenus.
 * @returns The final entries to render, in order.
 */
export function resolveContextMenuEntries(
	config: ContextMenuConfig | undefined,
	defaults: ContextMenuEntry[],
): ContextMenuEntry[] {
	const shown = (config?.defaultItems ?? true) ? defaults : []

	const { custom, defaults: shownDefaults } = replaceDefaults(config?.items ?? [], shown)

	const [first, second] =
		(config?.insert ?? 'after') === 'before' ? [custom, shownDefaults] : [shownDefaults, custom]

	return mergeContextMenuItems([first, second])
}

/** The key of a row (an item or a submenu), or `undefined` for a separator or a row with no key. */
function rowKey(entry: ContextMenuEntry): string | undefined {
	return 'separator' in entry ? undefined : entry.key
}

/**
 * Moves each custom row that has the key of a default row into the place of
 * that default. The first custom row with a key replaces the default. The
 * rows that replace a default leave the custom group, and the other custom
 * entries stay in their order ({@link withoutRows}). Only the top level counts: the rows inside a
 * submenu do not replace, and a separator never replaces.
 */
function replaceDefaults(
	custom: ContextMenuEntry[],
	defaults: ContextMenuEntry[],
): { custom: ContextMenuEntry[]; defaults: ContextMenuEntry[] } {
	const keys = new Set(defaults.map(rowKey).filter((key) => key !== undefined))

	const replacements = new Map<string, ContextMenuEntry>()

	for (const entry of custom) {
		const key = rowKey(entry)

		if (key !== undefined && keys.has(key) && !replacements.has(key)) replacements.set(key, entry)
	}

	if (replacements.size === 0) return { custom, defaults }

	const replacement = (entry: ContextMenuEntry) => {
		const key = rowKey(entry)

		return key === undefined ? undefined : replacements.get(key)
	}

	return {
		custom: withoutRows(custom, (entry) => replacement(entry) === entry),
		defaults: defaults.map((entry) => replacement(entry) ?? entry),
	}
}

/**
 * The entries without each row that `removed` names. A row that goes from
 * between two separators would leave them side by side, so the second of the
 * two goes too. A doubled separator that the caller wrote stays as it is.
 */
function withoutRows(
	entries: ContextMenuEntry[],
	removed: (entry: ContextMenuEntry) => boolean,
): ContextMenuEntry[] {
	const kept: ContextMenuEntry[] = []

	// A row went since the last entry that stays.
	let gap = false

	for (const entry of entries) {
		if (removed(entry)) {
			gap = true

			continue
		}

		const last = kept.at(-1)

		const doubled = gap && 'separator' in entry && last !== undefined && 'separator' in last

		if (!doubled) kept.push(entry)

		gap = false
	}

	return kept
}
