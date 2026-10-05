import { Field, Label } from 'ui/fieldset'
import { Input } from 'ui/input'

export default function Disabled() {
	return (
		<Field>
			<Label>Email</Label>
			<Input type="email" disabled defaultValue="jane@example.com" />
		</Field>
	)
}
