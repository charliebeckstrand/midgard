import { useState } from 'react'
import { Button } from 'ui/button'
import {
	CommandPalette,
	CommandPaletteItem,
	CommandPaletteLabel,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import { foldText } from 'ui/core'
import { Icon } from 'ui/icon'
import { Text } from 'ui/text'
import { commands } from './commands.tsx'

function MatchingCommands({ onRun }: { onRun: (label: string) => void }) {
	const query = foldText(useCommandPaletteDeferredQuery())

	return commands
		.filter((command) => foldText(command.label).includes(query))
		.map((command) => (
			<CommandPaletteItem
				key={command.id}
				disabled={command.id === 'delete'}
				onAction={() => onRun(command.label)}
			>
				<Icon icon={command.icon} />
				<CommandPaletteLabel>{command.label}</CommandPaletteLabel>
			</CommandPaletteItem>
		))
}

export default function WithActions() {
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
