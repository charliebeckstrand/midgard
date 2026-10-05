import { Field, Label } from 'ui/fieldset'
import { PasswordInput } from 'ui/password-input'

export default function ReadOnly() {
	return (
		<Field>
			<Label>Password</Label>
			<PasswordInput readOnly defaultValue="correct-horse-battery" />
		</Field>
	)
}
