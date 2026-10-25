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
	id: string
	label: string
	icon: ReactElement
	shortcut?: string
}

export const groups: { title: string; commands: Command[] }[] = [
	{
		title: 'Files',
		commands: [
			{ id: 'newFile', label: 'New file', icon: <FilePlus />, shortcut: '⌘N' },
			{ id: 'newFolder', label: 'New folder', icon: <FolderPlus />, shortcut: '⇧⌘N' },
			{ id: 'openFile', label: 'Open file', icon: <File />, shortcut: '⌘O' },
		],
	},
	{
		title: 'Edit',
		commands: [
			{ id: 'duplicate', label: 'Duplicate', icon: <Copy />, shortcut: '⌘D' },
			{ id: 'archive', label: 'Archive', icon: <Archive /> },
			{ id: 'delete', label: 'Delete', icon: <Trash2 />, shortcut: '⌘⌫' },
		],
	},
	{
		title: 'Application',
		commands: [
			{ id: 'profile', label: 'Profile', icon: <User /> },
			{ id: 'appearance', label: 'Appearance', icon: <Palette /> },
			{ id: 'settings', label: 'Settings', icon: <Settings />, shortcut: '⌘,' },
		],
	},
]

export const commands = groups.flatMap((group) => group.commands)
