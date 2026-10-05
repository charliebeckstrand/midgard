import { useState } from 'react'
import { Button } from 'ui/button'
import {
	CommandPalette,
	CommandPaletteItem,
	CommandPaletteLabel,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import { Icon } from 'ui/icon'
import { Text } from 'ui/text'
import { commands } from './commands.tsx'

function MatchingCommands({ onRun }: { onRun: (label: string) => void }) {
	const query = useCommandPaletteDeferredQuery().toLowerCase()

	return commands
		.filter((command) => command.label.toLowerCase().includes(query))
		.map((command) => (
			<CommandPaletteItem
				key={command.label}
				disabled={command.label === 'Delete'}
				onAction={() => onRun(command.label)}
			>
				<Icon icon={command.icon} />
				<CommandPaletteLabel>{command.label}</CommandPaletteLabel>
			</CommandPaletteItem>
		))
}

export default function ItemActions() {
	const [open, setOpen] = useState(false)

	const [lastCommand, setLastCommand] = useState<string | null>(null)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Open command palette</Button>
			<Text>Last command: {lastCommand ?? 'None'}</Text>
			<CommandPalette open={open} onOpenChange={setOpen} triggerShortcut={false}>
				<MatchingCommands onRun={setLastCommand} />
			</CommandPalette>
		</>
	)
}
