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
import type { ReactElement } from 'react'

export type Command = {
	label: string
	icon: ReactElement
	shortcut?: string
}

export const groups: { heading: string; commands: Command[] }[] = [
	{
		heading: 'Files',
		commands: [
			{ label: 'New file', icon: <FilePlus />, shortcut: '⌘N' },
			{ label: 'New folder', icon: <FolderPlus />, shortcut: '⇧⌘N' },
			{ label: 'Open file', icon: <File />, shortcut: '⌘O' },
		],
	},
	{
		heading: 'Edit',
		commands: [
			{ label: 'Duplicate', icon: <Copy />, shortcut: '⌘D' },
			{ label: 'Archive', icon: <Archive /> },
			{ label: 'Delete', icon: <Trash2 />, shortcut: '⌘⌫' },
		],
	},
	{
		heading: 'Application',
		commands: [
			{ label: 'Profile', icon: <User /> },
			{ label: 'Appearance', icon: <Palette /> },
			{ label: 'Settings', icon: <Settings />, shortcut: '⌘,' },
		],
	},
]

export const commands = groups.flatMap((group) => group.commands)
