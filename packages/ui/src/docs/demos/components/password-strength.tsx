import { useState } from 'react'
import { Field, Label } from '../../../components/fieldset'
import { PasswordInput } from '../../../components/password-input'
import {
	defaultPasswordRules,
	type PasswordRule,
	PasswordStrength,
} from '../../../components/password-strength'
import { Stack } from '../../../structure/stack'
import { Axes, Example } from '../../engine'

function BasicExample() {
	const [value, setValue] = useState('')

	return (
		<Stack gap="md">
			<Field>
				<Label htmlFor="password-strength-basic">Password</Label>
				<PasswordInput
					id="password-strength-basic"
					value={value}
					onChange={(event) => setValue(event.target.value)}
					placeholder="Enter password"
					autoComplete="new-password"
				/>
			</Field>
			<PasswordStrength value={value} />
		</Stack>
	)
}

const customRules: PasswordRule[] = [
	...defaultPasswordRules,
	{ id: 'length-12', label: 'At least 12 characters', test: (v) => v.length >= 12 },
]

function CustomRulesExample() {
	const [value, setValue] = useState('')

	return (
		<Stack gap="md">
			<Field>
				<Label htmlFor="password-strength-custom">Password</Label>
				<PasswordInput
					id="password-strength-custom"
					value={value}
					onChange={(event) => setValue(event.target.value)}
					placeholder="Enter password"
					autoComplete="new-password"
				/>
			</Field>
			<PasswordStrength value={value} rules={customRules} />
		</Stack>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="PasswordStrength"
				render={(props) => <PasswordStrength {...props} value="Secret12" />}
			/>

			<Example title="With input">
				<BasicExample />
			</Example>

			<Example title="Custom rules">
				<CustomRulesExample />
			</Example>
		</>
	)
}
