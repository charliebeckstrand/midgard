import { useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { PasswordInput } from 'ui/password-input'
import { PasswordStrength, type StrengthLevel } from 'ui/password-strength'
import { Stack } from 'ui/stack'

export default function MinimumStrength() {
	const [password, setPassword] = useState('')

	const [level, setLevel] = useState<StrengthLevel>('empty')

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
			<PasswordStrength
				value={password}
				onStrengthChange={(strength) => setLevel(strength.level)}
			/>
			<Flex>
				<Button disabled={level !== 'good' && level !== 'strong'}>Create account</Button>
			</Flex>
		</Stack>
	)
}
