'use client'

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
import { type ReactElement, useEffect, useState } from 'react'
import { Alert, AlertTitle } from '../../components/alert'
import { Button } from '../../components/button'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteShortcut,
} from '../../components/command-palette'
import { Icon } from '../../components/icon'
import { Kbd } from '../../components/kbd'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

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
		id: 'appearance',
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

export default function CommandPaletteDemo() {
	const [open, setOpen] = useState(false)

	// Open on ⌘K / Ctrl+K
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault()

				setOpen((prev) => !prev)
			}
		}

		document.addEventListener('keydown', onKeyDown)

		return () => document.removeEventListener('keydown', onKeyDown)
	}, [])

	return (
		<Stack gap="xl">
			<Example title="Default">
				<Button color="blue" variant="soft" suffix={<Kbd cmd>K</Kbd>} onClick={() => setOpen(true)}>
					Open command palette
				</Button>

				<CommandPalette open={open} onOpenChange={setOpen}>
					{(query) => {
						const results = filterCommands(query)

						if (!results.length) {
							return (
								<Alert type="warning" block>
									<AlertTitle>No commands found</AlertTitle>
								</Alert>
							)
						}

						return groups.map((group) => {
							const items = results.filter((c) => c.group === group)

							if (!items.length) return null

							return (
								<CommandPaletteGroup key={group} heading={group}>
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
					}}
				</CommandPalette>
			</Example>
		</Stack>
	)
}
