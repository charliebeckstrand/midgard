import { Field, Label } from 'ui/fieldset'
import { SearchInput } from 'ui/search-input'

export default function Disabled() {
	return (
		<Field>
			<Label>Search projects</Label>
			<SearchInput disabled placeholder="Search by name" />
		</Field>
	)
}
