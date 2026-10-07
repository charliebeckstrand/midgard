import { Field, Label } from 'ui/fieldset'
import { Input } from 'ui/input'

export default function Clearable() {
	return (
		<Field>
			<Label>Website</Label>
			<Input type="url" clearable defaultValue="https://example.com" placeholder="https://" />
		</Field>
	)
}
