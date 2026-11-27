import { useState } from 'react'
import { foldText } from 'ui/core'
import { Field, Label } from 'ui/fieldset'
import { SearchInput } from 'ui/search-input'
import { Text } from 'ui/text'
import { projects } from './projects.ts'

export default function Controlled() {
	const [query, setQuery] = useState('')

	const matches = projects.filter((project) => foldText(project).includes(foldText(query.trim())))

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
