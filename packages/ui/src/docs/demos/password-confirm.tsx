import { Field, Label } from '../../components/fieldset'
import { PasswordConfirm, PasswordConfirmInput } from '../../components/password-confirm'
import { PasswordInput } from '../../components/password-input'
import { Example } from '../components/example'

export function Demo() {
	return (
		<Example title="Default">
			<PasswordConfirm warning="Passwords do not match">
				<Field>
					<Label>Password</Label>
					<PasswordInput placeholder="Enter password" />
				</Field>
				<Field>
					<Label>Confirm password</Label>
					<PasswordConfirmInput placeholder="Confirm password" />
				</Field>
			</PasswordConfirm>
		</Example>
	)
}
