import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { SearchInput } from 'ui/search-input'
import { Text } from 'ui/text'

const projects = ['Atlas', 'Beacon', 'Comet', 'Horizon', 'Lighthouse']

export default function Controlled() {
	const [query, setQuery] = useState('')

	const matches = projects.filter((project) =>
		project.toLowerCase().includes(query.trim().toLowerCase()),
	)

	return (
		<>
			<Field>
				<Label>Search projects</Label>
				<SearchInput value={query} onValueChange={setQuery} placeholder="Search by name" />
			</Field>
			<Text>{matches.length > 0 ? matches.join(', ') : 'No projects match.'}</Text>
		</>
	)
}
