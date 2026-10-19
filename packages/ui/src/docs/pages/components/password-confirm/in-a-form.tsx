import { Field, Label, Message } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Form, FormSubmit } from 'ui/form'
import { PasswordConfirm, PasswordConfirmNew, PasswordConfirmRepeat } from 'ui/password-confirm'
import { Stack } from 'ui/stack'

export default function InAForm() {
	return (
		<Form
			defaultValues={{ password: '', confirm: '' }}
			validate={{
				password: (value) => (value.length < 8 ? 'Use at least 8 characters.' : undefined),
				confirm: (value, values) =>
					value === values.password ? undefined : 'Enter the same password again.',
			}}
		>
			<Stack gap="lg">
				<PasswordConfirm warning="Enter the same password again.">
					<Field>
						<Label>Password</Label>
						<PasswordConfirmNew name="password" autoComplete="new-password" />
						<Message name="password" />
					</Field>
					<Field>
						<Label>Confirm password</Label>
						<PasswordConfirmRepeat name="confirm" autoComplete="new-password" />
						<Message name="confirm" />
					</Field>
				</PasswordConfirm>
				<Flex>
					<FormSubmit>Set password</FormSubmit>
				</Flex>
			</Stack>
		</Form>
	)
}
