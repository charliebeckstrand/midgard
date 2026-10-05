import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { PasswordInput } from 'ui/password-input'
import { defaultPasswordRules, type PasswordRule, PasswordStrength } from 'ui/password-strength'
import { Stack } from 'ui/stack'

const rules: PasswordRule[] = [
	...defaultPasswordRules,
	{ id: 'lowercase', label: 'One lowercase letter', test: (value) => /[a-z]/.test(value) },
]

export default function CustomRules() {
	const [password, setPassword] = useState('')

	return (
		<Stack gap="md">
			<Field>
				<Label>Password</Label>
				<PasswordInput
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					placeholder="Enter password"
					autoComplete="new-password"
				/>
			</Field>
			<PasswordStrength value={password} rules={rules} />
		</Stack>
	)
}
