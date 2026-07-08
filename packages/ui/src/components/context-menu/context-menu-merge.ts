import type { ContextMenuConfig, ContextMenuEntry, ContextMenuItem } from './types'

/** The divider {@link resolveContextMenuEntries} drops between the default and custom groups. @internal */
const GROUP_SEPARATOR: ContextMenuEntry = { key: 'context-menu-default-separator', separator: true }

/**
 * Joins non-empty groups of entries with a separator between each, dropping
 * empty groups so no menu ever opens on a leading, trailing, or doubled rule.
 * The building block a host uses to set its own default groups apart — a
 * column's sort actions from the table-wide tools below them.
 *
 * @param groups - Entry groups in render order; empties are skipped.
 * @returns The groups concatenated, one separator between each surviving pair.
 */
export function mergeContextMenuItems(groups: ContextMenuEntry[][]): ContextMenuEntry[] {
	const kept = groups.filter((group) => group.length > 0)

	return kept.flatMap((group, index) =>
		index === 0 ? group : [{ key: `context-menu-group-${index}`, separator: true }, ...group],
	)
}

/**
 * Resolves a host's {@link ContextMenuConfig} against the default items it
 * supplies: the custom items in their array order, the defaults when
 * `defaultItems` is on, and a separator between the two groups when both show —
 * ordered by `position`. Either group empty, no separator renders; both empty,
 * the result is empty and the host leaves the native menu alone.
 *
 * @param config - The caller's configuration, or `undefined` for all defaults.
 * @param defaults - The host's built-in items.
 * @returns The final entries to render, in order.
 */
export function resolveContextMenuEntries(
	config: ContextMenuConfig | undefined,
	defaults: ContextMenuItem[],
): ContextMenuEntry[] {
	const custom = config?.items ?? []

	const shownDefaults = (config?.defaultItems ?? true) ? defaults : []

	if (custom.length === 0) return shownDefaults

	if (shownDefaults.length === 0) return custom

	return (config?.position ?? 'after') === 'before'
		? [...custom, GROUP_SEPARATOR, ...shownDefaults]
		: [...shownDefaults, GROUP_SEPARATOR, ...custom]
}
