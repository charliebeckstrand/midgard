import { useState } from 'react'
import { Button } from 'ui/button'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteText,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import { profiles } from '../../../data/people.ts'

function MatchingPeople() {
	const query = useCommandPaletteDeferredQuery().toLowerCase()

	return profiles
		.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(query))
		.map((person) => (
			<CommandPaletteItem key={person.email}>
				<CommandPaletteText>
					<CommandPaletteLabel>{person.name}</CommandPaletteLabel>
					<CommandPaletteDescription>{person.email}</CommandPaletteDescription>
				</CommandPaletteText>
			</CommandPaletteItem>
		))
}

export default function WithDescriptions() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Find a person</Button>
			<CommandPalette
				open={open}
				onOpenChange={setOpen}
				placeholder="Search people"
				triggerShortcut={false}
			>
				<MatchingPeople />
			</CommandPalette>
		</>
	)
}
