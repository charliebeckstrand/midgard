import { Icon } from '../icon'
import { MenuItem, MenuLabel, MenuSeparator } from '../menu'
import type { ContextMenuEntry } from './types'

/** Props for {@link ContextMenuList}. */
export type ContextMenuListProps = {
	/** The rows to render, in order — actionable items and separators. */
	entries: ContextMenuEntry[]
}

/**
 * Renders a resolved list of {@link ContextMenuEntry} rows as `Menu` items and
 * separators, for placement inside a `MenuContent`. The one renderer both the
 * {@link ContextMenu} wrapper and a bespoke right-click surface (a `Grid`'s
 * per-cell menu) draw through, so every context menu reads the same.
 *
 * @remarks An entry's `key` identifies its row; absent, the render index stands
 * in — set keys on a list that reorders. An item's `onSelect` runs on selection,
 * then the menu closes.
 */
export function ContextMenuList({ entries }: ContextMenuListProps) {
	return (
		<>
			{entries.map((entry, index) => {
				const key = entry.key ?? index

				if ('separator' in entry) return <MenuSeparator key={key} />

				return (
					<MenuItem key={key} onAction={entry.onSelect} disabled={entry.disabled}>
						{entry.icon ? <Icon icon={entry.icon} /> : null}

						<MenuLabel>{entry.label}</MenuLabel>
					</MenuItem>
				)
			})}
		</>
	)
}
