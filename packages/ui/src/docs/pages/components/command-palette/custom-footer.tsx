import { Settings } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import {
	CommandPalette,
	CommandPaletteClose,
	CommandPaletteItem,
	CommandPaletteLabel,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import { Icon } from 'ui/icon'
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

export default function CustomFooter() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Open command palette</Button>
			<CommandPalette
				open={open}
				onOpenChange={setOpen}
				triggerShortcut={false}
				footer={
					<>
						<Button variant="outline" prefix={<Icon icon={<Settings />} />}>
							Preferences
						</Button>
						<CommandPaletteClose />
					</>
				}
			>
				<MatchingCommands />
			</CommandPalette>
		</>
	)
}
