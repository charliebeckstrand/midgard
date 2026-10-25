import { useState } from 'react'
import { Button } from 'ui/button'
import {
	CommandPalette,
	CommandPaletteItem,
	CommandPaletteLabel,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import { Icon } from 'ui/icon'
import { Kbd } from 'ui/kbd'
import { ShortcutHint } from '../../../kit/shortcut-hint.tsx'
import { commands } from './commands.tsx'

function MatchingCommands() {
	const query = useCommandPaletteDeferredQuery().toLowerCase()

	return commands
		.filter((command) => command.label.toLowerCase().includes(query))
		.map((command) => (
			<CommandPaletteItem key={command.id}>
				<Icon icon={command.icon} />
				<CommandPaletteLabel>{command.label}</CommandPaletteLabel>
			</CommandPaletteItem>
		))
}

export default function KeyboardShortcut() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button
				suffix={
					<Kbd>
						<ShortcutHint keyName="J" />
					</Kbd>
				}
				onClick={() => setOpen(true)}
			>
				Search commands
			</Button>
			<CommandPalette open={open} onOpenChange={setOpen} triggerShortcut="$mod+KeyJ">
				<MatchingCommands />
			</CommandPalette>
		</>
	)
}
