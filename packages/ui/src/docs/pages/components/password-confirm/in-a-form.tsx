import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Form } from 'ui/form'
import { PasswordConfirm, PasswordConfirmNew, PasswordConfirmRepeat } from 'ui/password-confirm'
import { Stack } from 'ui/stack'

export default function InAForm() {
	return (
		<Form
			defaultValues={{ password: '', confirm: '' }}
			validate={{
				password: (value) => (value.length < 8 ? 'Use at least 8 characters.' : undefined),
				confirm: (value, values) =>
					value === values.password ? undefined : 'Passwords do not match.',
			}}
		>
			<Stack gap="lg">
				<PasswordConfirm warning="Passwords do not match.">
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
					<Button type="submit">Set password</Button>
				</Flex>
			</Stack>
		</Form>
	)
}
