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
import { Kbd } from 'ui/kbd'
import { ShortcutHint } from '../../../kit/shortcut-hint.tsx'
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
