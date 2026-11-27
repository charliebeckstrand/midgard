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
import { foldText } from 'ui/core'
import { profiles } from '../../../data/people.ts'

function MatchingPeople() {
	const query = foldText(useCommandPaletteDeferredQuery())

	return profiles
		.filter((person) => foldText(`${person.name} ${person.email}`).includes(query))
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
