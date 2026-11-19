import { useState } from 'react'
import { Button } from 'ui/button'
import {
	CommandPalette,
	CommandPaletteItem,
	CommandPaletteLabel,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import { VirtualOptions } from 'ui/primitives/virtual-options'

const commands = Array.from({ length: 5000 }, (_, index) => {
	const id = index + 1

	return { id, label: `Command ${id}` }
})

function MatchingCommands() {
	const query = useCommandPaletteDeferredQuery().toLowerCase()

	const matches = commands.filter((command) => command.label.toLowerCase().includes(query))

	return (
		// The dialog body is the scroller. It grows with the rows up to the cap of the panel.
		<VirtualOptions items={matches} getOptionId={(command) => `command-${command.id}`}>
			{(command, _index, meta) => (
				<CommandPaletteItem key={command.id} id={`command-${command.id}`} {...meta}>
					<CommandPaletteLabel>{command.label}</CommandPaletteLabel>
				</CommandPaletteItem>
			)}
		</VirtualOptions>
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
