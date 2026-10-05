import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form } from 'ui/form'
import { PasswordInput } from 'ui/password-input'
import { Stack } from 'ui/stack'

export default function Validation() {
	return (
		<Form
			defaultValues={{ password: '', confirm: '' }}
			validate={{
				password: (value) => {
					const issues: string[] = []

					if (value.length < 8) issues.push('Use at least 8 characters.')

					if (!/\d/.test(value)) issues.push('Add a number.')

					return issues
				},
				confirm: (value, values) =>
					value === values.password ? undefined : 'The passwords do not match.',
			}}
			onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1000))}
		>
			<Stack gap="lg">
				<Field autoComplete="new-password">
					<Label>Password</Label>
					<PasswordInput name="password" />
					<Message name="password" all />
				</Field>
				<Field autoComplete="new-password">
					<Label>Confirm password</Label>
					<PasswordInput name="confirm" />
					<Message name="confirm" />
				</Field>
				<Button type="submit">Create account</Button>
			</Stack>
		</Form>
	)
}
