import { Field, Label } from 'ui/fieldset'
import { PasswordInput } from 'ui/password-input'

export default function Disabled() {
	return (
		<Field>
			<Label>Password</Label>
			<PasswordInput disabled defaultValue="correct-horse-battery" />
		</Field>
	)
}
