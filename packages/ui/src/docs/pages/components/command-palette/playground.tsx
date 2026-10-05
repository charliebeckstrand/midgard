import { useState } from 'react'
import { Button } from 'ui/button'
import {
	CommandPalette,
	CommandPaletteGroup,
	CommandPaletteHeading,
	CommandPaletteItem,
	CommandPaletteLabel,
	type CommandPaletteProps,
	CommandPaletteShortcut,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import { Icon } from 'ui/icon'
import { groups } from './commands.tsx'

function MatchingCommands() {
	const query = useCommandPaletteDeferredQuery().toLowerCase()

	return groups.map(({ heading, commands }) => {
		const matches = commands.filter((command) => command.label.toLowerCase().includes(query))

		if (matches.length === 0) return null

		return (
			<CommandPaletteGroup key={heading}>
				<CommandPaletteHeading>{heading}</CommandPaletteHeading>
				{matches.map((command) => (
					<CommandPaletteItem key={command.label}>
						<Icon icon={command.icon} />
						<CommandPaletteLabel>{command.label}</CommandPaletteLabel>
						{command.shortcut && (
							<CommandPaletteShortcut>{command.shortcut}</CommandPaletteShortcut>
						)}
					</CommandPaletteItem>
				))}
			</CommandPaletteGroup>
		)
	})
}

export default function CommandPalettePlayground(props: CommandPaletteProps) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Open command palette</Button>
			<CommandPalette {...props} open={open} onOpenChange={setOpen} triggerShortcut={false}>
				<MatchingCommands />
			</CommandPalette>
		</>
	)
}
