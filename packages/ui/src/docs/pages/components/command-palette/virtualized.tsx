import { useState } from 'react'
import { Button } from 'ui/button'
import {
	CommandPalette,
	CommandPaletteItem,
	CommandPaletteLabel,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import { VirtualOptions } from 'ui/primitives/virtual-options'

const commands = Array.from({ length: 5000 }, (_, index) => ({
	id: index + 1,
	label: `Command ${index + 1}`,
}))

function MatchingCommands() {
	const query = useCommandPaletteDeferredQuery().toLowerCase()

	const matches = commands.filter((command) => command.label.toLowerCase().includes(query))

	return (
		// The dialog body grows with its content. Give the list a fixed height, so that it scrolls.
		<div className="h-80 overflow-y-auto">
			<VirtualOptions items={matches} getOptionId={(command) => `command-${command.id}`}>
				{(command, _index, meta) => (
					<CommandPaletteItem key={command.id} id={`command-${command.id}`} {...meta}>
						<CommandPaletteLabel>{command.label}</CommandPaletteLabel>
					</CommandPaletteItem>
				)}
			</VirtualOptions>
		</div>
	)
}

export default function Virtualized() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Search 5,000 commands</Button>
			<CommandPalette open={open} onOpenChange={setOpen} triggerShortcut={false}>
				<MatchingCommands />
			</CommandPalette>
		</>
	)
}
