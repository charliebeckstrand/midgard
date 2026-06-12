import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { PasswordInput } from '../../components/password-input'
import {
	defaultPasswordRules,
	type PasswordRule,
	PasswordStrength,
} from '../../components/password-strength'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

function BasicExample() {
	const [value, setValue] = useState('')

	return (
		<Stack gap="md">
			<Field>
				<Label htmlFor="password-strength-basic">Password</Label>
				<PasswordInput
					id="password-strength-basic"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					placeholder="Enter password"
					autoComplete="new-password"
				/>
			</Field>
			<PasswordStrength value={value} />
		</Stack>
	)
}

function MeterOnlyExample() {
	const [value, setValue] = useState('')

	return (
		<Stack gap="md">
			<Field>
				<Label htmlFor="password-strength-meter">Password</Label>
				<PasswordInput
					id="password-strength-meter"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					placeholder="Enter password"
					autoComplete="new-password"
				/>
			</Field>
			<PasswordStrength value={value} showRules={false} />
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
					onChange={(e) => setValue(e.target.value)}
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
			<Example title="With password input">
				<BasicExample />
			</Example>

			<Example title="Meter only">
				<MeterOnlyExample />
			</Example>

			<Example title="Custom rules">
				<CustomRulesExample />
			</Example>
		</>
	)
}
