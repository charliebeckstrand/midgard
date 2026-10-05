import { ArrowDownUp, Download, EyeOff, Pin } from 'lucide-react'
import { ContextMenu, type ContextMenuEntry } from 'ui/context-menu'
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

export default function Submenus() {
	return (
		<ContextMenu items={entries} aria-label="Column actions">
			<div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 px-10 py-8 dark:border-zinc-700">
				<Text tone="muted" className="select-none">
					Right-click the column
				</Text>
			</div>
		</ContextMenu>
	)
}
