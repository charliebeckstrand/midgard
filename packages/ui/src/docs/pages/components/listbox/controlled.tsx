import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Text } from 'ui/text'
import { teamName, teams } from './teams.ts'

export default function Controlled() {
	const [selected, setSelected] = useState(['design', 'support'])

	return (
		<>
			<Field>
				<Label>Notify teams</Label>
				<Listbox
					multiple
					placeholder="Select teams"
					value={selected}
					onValueChange={setSelected}
					displayValue={teamName}
				>
					{teams.map((team) => (
						<ListboxOption key={team.id} value={team.id}>
							<ListboxLabel>{team.name}</ListboxLabel>
						</ListboxOption>
					))}
				</Listbox>
			</Field>
			<Text>Value: {selected.length > 0 ? selected.join(', ') : 'Empty'}</Text>
		</>
	)
}
