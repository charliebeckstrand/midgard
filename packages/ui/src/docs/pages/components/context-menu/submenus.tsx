import { ArrowDownUp, Download, EyeOff, Pin } from 'lucide-react'
import { type ContextMenuEntry, ContextMenuList } from 'ui/context-menu'
import { Menu, MenuContent } from 'ui/menu'
import { Text } from 'ui/text'

const entries: ContextMenuEntry[] = [
	{
		key: 'sort',
		label: 'Sort',
		icon: <ArrowDownUp />,
		items: [
			{ key: 'ascending', label: 'Ascending' },
			{ key: 'descending', label: 'Descending' },
		],
	},
	{
		key: 'pin',
		label: 'Pin',
		icon: <Pin />,
		items: [
			{ key: 'left', label: 'To the left' },
			{ key: 'right', label: 'To the right' },
		],
	},
	{ key: 'hide', label: 'Hide column', icon: <EyeOff /> },
	{ separator: true },
	{
		key: 'export',
		label: 'Export',
		icon: <Download />,
		items: [
			{ key: 'csv', label: 'CSV' },
			{ key: 'excel', label: 'Excel' },
		],
	},
]

// The `items` of a ContextMenu take no submenus. A Menu with no `placement` and a
// ContextMenuList render the full set of entries.
export default function Submenus() {
	return (
		<Menu>
			<div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 px-10 py-8 dark:border-zinc-700">
				<Text tone="muted" className="select-none">
					Right-click the column
				</Text>
			</div>
			<MenuContent aria-label="Column actions">
				<ContextMenuList entries={entries} />
			</MenuContent>
		</Menu>
	)
}
