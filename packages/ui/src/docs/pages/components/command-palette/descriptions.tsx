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

const people = [
	{ name: 'Arlene McCoy', email: 'arlene@example.com' },
	{ name: 'Devon Webb', email: 'devon@example.com' },
	{ name: 'Hellen Schmidt', email: 'hellen@example.com' },
	{ name: 'Tanya Fox', email: 'tanya@example.com' },
	{ name: 'Tom Cook', email: 'tom@example.com' },
]

function MatchingPeople() {
	const query = useCommandPaletteDeferredQuery().toLowerCase()

	return people
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

export default function Descriptions() {
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
