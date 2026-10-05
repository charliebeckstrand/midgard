import { Field, Label } from 'ui/fieldset'
import {
	PasswordConfirm,
	PasswordConfirmNew,
	type PasswordConfirmProps,
	PasswordConfirmRepeat,
} from 'ui/password-confirm'

export default function PasswordConfirmPlayground(props: PasswordConfirmProps) {
	return (
		<PasswordConfirm {...props} warning="Passwords do not match.">
			<Field>
				<Label>Password</Label>
				<PasswordConfirmNew placeholder="Enter password" autoComplete="new-password" />
			</Field>
			<Field>
				<Label>Confirm password</Label>
				<PasswordConfirmRepeat placeholder="Confirm password" autoComplete="new-password" />
			</Field>
		</PasswordConfirm>
	)
}
