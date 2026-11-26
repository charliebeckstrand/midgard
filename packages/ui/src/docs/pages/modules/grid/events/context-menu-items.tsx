import { Mail } from 'lucide-react'
import { useState } from 'react'
import { Grid, type GridContextMenu } from 'ui/grid'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { columns, type Person, people } from '../data.tsx'

// A builder gets the right-clicked cell and the default items, and returns
// the items of the menu. This one adds an item that names the row, before Copy.
function menu(onEmail: (row: Person) => void): GridContextMenu<Person> {
	return {
		cell: ({ row }, defaults) => [
			{ key: 'email', label: `Email ${row.name}`, icon: <Mail />, onAction: () => onEmail(row) },
			{ separator: true },
			...defaults,
		],
	}
}

export default function ContextMenuItems() {
	const [emailed, setEmailed] = useState<Person>()

	const [contextMenu] = useState(() => menu(setEmailed))

	// Right-click a cell to open its menu.
	return (
		<Stack gap="md">
			<Grid
				tableProps={{ 'aria-label': 'Context menu items' }}
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
				contextMenu={contextMenu}
			/>
			<Text>Last email: {emailed ? emailed.name : 'None'}</Text>
		</Stack>
	)
}
