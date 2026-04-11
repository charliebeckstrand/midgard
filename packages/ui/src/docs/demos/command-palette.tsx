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
import { useEffect, useState } from 'react'
import { Button } from '../../components/button'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteEmpty,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteShortcut,
} from '../../components/command-palette'
import { Icon } from '../../components/icon'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Overlay' }

type Command = {
	id: string
	label: string
	description?: string
	shortcut?: string
	icon: React.ReactElement
	group: 'Files' | 'Edit' | 'Application'
}

const commands: Command[] = [
	{
		id: 'new-file',
		label: 'New file',
		shortcut: '⌘N',
		icon: <FilePlus />,
		group: 'Files',
	},
	{
		id: 'new-folder',
		label: 'New folder',
		shortcut: '⇧⌘N',
		icon: <FolderPlus />,
		group: 'Files',
	},
	{
		id: 'open-file',
		label: 'Open file…',
		shortcut: '⌘O',
		icon: <File />,
		group: 'Files',
	},
	{
		id: 'duplicate',
		label: 'Duplicate',
		description: 'Create a copy of the current item',
		shortcut: '⌘D',
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
		shortcut: '⌫',
		icon: <Trash2 />,
		group: 'Edit',
	},
	{
		id: 'profile',
		label: 'Profile',
		description: 'Manage your account details',
		icon: <User />,
		group: 'Application',
	},
	{
		id: 'appearance',
		label: 'Appearance',
		description: 'Change theme and accent color',
		icon: <Palette />,
		group: 'Application',
	},
	{
		id: 'settings',
		label: 'Settings',
		shortcut: '⌘,',
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
	const [lastRan, setLastRan] = useState<string | null>(null)

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
		<div className="space-y-8">
			<Example
				title="Command palette"
				code={code`
					import {
						CommandPalette,
						CommandPaletteGroup,
						CommandPaletteItem,
						CommandPaletteLabel,
						CommandPaletteShortcut,
					} from 'ui/command-palette'
					import { Button } from 'ui/button'
					import { Icon } from 'ui/icon'
					import { FilePlus, Settings } from 'lucide-react'

					const [open, setOpen] = useState(false)

					<Button onClick={() => setOpen(true)}>Open palette</Button>
					<CommandPalette open={open} onClose={() => setOpen(false)}>
						{(query) => (
							<CommandPaletteGroup heading="Files">
								<CommandPaletteItem onAction={() => console.log('new file')}>
									<Icon icon={<FilePlus />} />
									<CommandPaletteLabel>New file</CommandPaletteLabel>
									<CommandPaletteShortcut>⌘N</CommandPaletteShortcut>
								</CommandPaletteItem>
							</CommandPaletteGroup>
						)}
					</CommandPalette>
				`}
			>
				<div className="flex flex-col items-start gap-3">
					<Button onClick={() => setOpen(true)}>Open command palette</Button>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						Press{' '}
						<kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
							⌘K
						</kbd>{' '}
						to toggle.{' '}
						{lastRan && (
							<span>
								Last action: <span className="font-mono">{lastRan}</span>
							</span>
						)}
					</p>
				</div>
				<CommandPalette open={open} onClose={() => setOpen(false)}>
					{(query) => {
						const results = filterCommands(query)

						if (!results.length) {
							return <CommandPaletteEmpty>No commands found.</CommandPaletteEmpty>
						}

						return groups.map((group) => {
							const items = results.filter((c) => c.group === group)

							if (!items.length) return null

							return (
								<CommandPaletteGroup key={group} heading={group}>
									{items.map((c) => (
										<CommandPaletteItem key={c.id} onAction={() => setLastRan(c.label)}>
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
		</div>
	)
}
