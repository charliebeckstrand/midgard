import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { PasswordInput } from 'ui/password-input'
import { PasswordStrength } from 'ui/password-strength'

export default function WithInput() {
	const [password, setPassword] = useState('')

	return (
		<Field>
			<Label>Password</Label>
			<PasswordInput
				value={password}
				onChange={(event) => setPassword(event.target.value)}
				placeholder="Enter password"
				autoComplete="new-password"
			/>
			<PasswordStrength value={password} />
		</Field>
	)
}
