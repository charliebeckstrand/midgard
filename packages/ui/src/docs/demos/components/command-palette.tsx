import {
	Archive,
	Copy,
	File,
	FilePlus,
	FolderPlus,
	Palette,
	Settings,
	Trash2,
	User,
} from 'lucide-react'
import { type ReactElement, useState } from 'react'
import { Alert, AlertTitle } from '../../../components/alert'
import { Button } from '../../../components/button'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteShortcut,
	useCommandPaletteQuery,
} from '../../../components/command-palette'
import { Icon } from '../../../components/icon'
import { Kbd } from '../../../components/kbd'
import { Example } from '../../engine'

type Command = {
	id: string
	label: string
	description?: string
	shortcut?: string
	icon: ReactElement
	group: 'Files' | 'Edit' | 'Application'
}

const commands: Command[] = [
	{
		id: 'new-file',
		label: 'New file',
		icon: <FilePlus />,
		group: 'Files',
	},
	{
		id: 'new-folder',
		label: 'New folder',
		icon: <FolderPlus />,
		group: 'Files',
	},
	{
		id: 'open-file',
		label: 'Open file',
		icon: <File />,
		group: 'Files',
	},
	{
		id: 'duplicate',
		label: 'Duplicate',
		icon: <Copy />,
		group: 'Edit',
	},
	{
		id: 'archive',
		label: 'Archive',
		icon: <Archive />,
		group: 'Edit',
	},
	{
		id: 'delete',
		label: 'Delete',
		icon: <Trash2 />,
		group: 'Edit',
	},
	{
		id: 'profile',
		label: 'Profile',
		icon: <User />,
		group: 'Application',
	},
	{
		id: 'type',
		label: 'Appearance',
		icon: <Palette />,
		group: 'Application',
	},
	{
		id: 'settings',
		label: 'Settings',
		icon: <Settings />,
		group: 'Application',
	},
]

const groups: Command['group'][] = ['Files', 'Edit', 'Application']

function filterCommands(query: string) {
	if (!query) return commands

	const q = query.toLowerCase()

	return commands.filter(
		(c) =>
			c.label.toLowerCase().includes(q) ||
			c.description?.toLowerCase().includes(q) ||
			c.group.toLowerCase().includes(q),
	)
}

function CommandResults() {
	const { deferredQuery } = useCommandPaletteQuery()

	const results = filterCommands(deferredQuery)

	if (!results.length) {
		return (
			<Alert severity="warning" block>
				<AlertTitle>No commands found</AlertTitle>
			</Alert>
		)
	}

	return groups.map((group) => {
		const items = results.filter((c) => c.group === group)

		if (!items.length) return null

		return (
			<CommandPaletteGroup key={group} title={group}>
				{items.map((c) => (
					<CommandPaletteItem key={c.id}>
						<Icon icon={c.icon} size="sm" />
						<CommandPaletteLabel>{c.label}</CommandPaletteLabel>
						{c.description && (
							<CommandPaletteDescription>{c.description}</CommandPaletteDescription>
						)}
						{c.shortcut && <CommandPaletteShortcut>{c.shortcut}</CommandPaletteShortcut>}
					</CommandPaletteItem>
				))}
			</CommandPaletteGroup>
		)
	})
}

export function Demo() {
	const [open, setOpen] = useState(false)

	return (
		<Example title="Default">
			<Button
				color="blue"
				variant="soft"
				suffix={<Kbd command>K</Kbd>}
				onClick={() => setOpen(true)}
			>
				Open command palette
			</Button>

			<CommandPalette open={open} onOpenChange={setOpen}>
				<CommandResults />
			</CommandPalette>
		</Example>
	)
}
