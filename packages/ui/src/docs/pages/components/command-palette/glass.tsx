import { useState } from 'react'
import { Button } from 'ui/button'
import {
	CommandPalette,
	CommandPaletteItem,
	CommandPaletteLabel,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import { Icon } from 'ui/icon'
import { GlassProvider } from 'ui/providers/glass'
import { commands } from './commands.tsx'

function MatchingCommands() {
	const query = useCommandPaletteDeferredQuery().toLowerCase()

	return commands
		.filter((command) => command.label.toLowerCase().includes(query))
		.map((command) => (
			<CommandPaletteItem key={command.label}>
				<Icon icon={command.icon} />
				<CommandPaletteLabel>{command.label}</CommandPaletteLabel>
			</CommandPaletteItem>
		))
}

export default function Glass() {
	const [open, setOpen] = useState(false)

	return (
		<GlassProvider>
			<Button onClick={() => setOpen(true)}>Open command palette</Button>
			<CommandPalette open={open} onOpenChange={setOpen} triggerShortcut={false}>
				<MatchingCommands />
			</CommandPalette>
		</GlassProvider>
	)
}
