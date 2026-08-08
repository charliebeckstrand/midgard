import { Icon } from '../icon'
import { MenuItem, MenuLabel, MenuSeparator, MenuSub } from '../menu'
import type { ContextMenuEntry } from './types'

/** Props for {@link ContextMenuList}. */
export type ContextMenuListProps = {
	/** The rows to render, in order — actionable items and separators. */
	entries: ContextMenuEntry[]
}

/**
 * Renders a resolved list of {@link ContextMenuEntry} rows as `Menu` items,
 * separators, and submenus, for placement inside a `MenuContent`. The one
 * renderer both the {@link ContextMenu} wrapper and a bespoke right-click
 * surface (a `Grid`'s per-cell menu) draw through, so every context menu reads
 * the same.
 *
 * @remarks An entry's `key` identifies its row; absent, the render index stands
 * in — set keys on a list that reorders. An item's `onAction` runs on selection,
 * then the menu closes. A submenu entry recurses through this same renderer, so
 * its rows nest to any depth.
 */
export function ContextMenuList({ entries }: ContextMenuListProps) {
	return (
		<>
			{entries.map((entry, index) => {
				const key = entry.key ?? index

				if ('separator' in entry) return <MenuSeparator key={key} />

				if ('items' in entry) {
					return (
						<MenuSub key={key} label={entry.label} icon={entry.icon} disabled={entry.disabled}>
							<ContextMenuList entries={entry.items} />
						</MenuSub>
					)
				}

				return (
					<MenuItem key={key} onAction={entry.onAction} disabled={entry.disabled}>
						{entry.icon ? <Icon icon={entry.icon} /> : null}

						<MenuLabel>{entry.label}</MenuLabel>
					</MenuItem>
				)
			})}
		</>
	)
}
