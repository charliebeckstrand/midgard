import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { PasswordConfirm, PasswordConfirmNew, PasswordConfirmRepeat } from 'ui/password-confirm'
import { PasswordStrength } from 'ui/password-strength'

export default function WithStrengthMeter() {
	const [password, setPassword] = useState('')

	return (
		<PasswordConfirm warning="Passwords do not match.">
			<Field>
				<Label>Password</Label>
				<PasswordConfirmNew
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					placeholder="Enter password"
					autoComplete="new-password"
				/>
			</Field>
			<PasswordStrength value={password} />
			<Field>
				<Label>Confirm password</Label>
				<PasswordConfirmRepeat placeholder="Confirm password" autoComplete="new-password" />
			</Field>
		</PasswordConfirm>
	)
}
