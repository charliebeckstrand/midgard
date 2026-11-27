import { Settings } from 'lucide-react'
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
import { commands } from './commands.tsx'

function MatchingCommands() {
	const query = foldText(useCommandPaletteDeferredQuery())

	return commands
		.filter((command) => foldText(command.label).includes(query))
		.map((command) => (
			<CommandPaletteItem key={command.id}>
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
					<Button variant="outline" prefix={<Icon icon={<Settings />} />}>
						Preferences
					</Button>
				}
			>
				<MatchingCommands />
			</CommandPalette>
		</>
	)
}
