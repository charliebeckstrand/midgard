import { Field, Label, Message } from '../../../../components/fieldset'
import { Input } from '../../../../components/input'
import { PasswordInput } from '../../../../components/password-input'
import { Stack } from '../../../../components/stack'
import { Example } from '../../../engine'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Severity">
				<Stack gap="lg">
					<Field>
						<Label>Email</Label>
						<Input defaultValue="not-an-email" />
						<Message severity="error">Enter a valid email address.</Message>
					</Field>
					<Field>
						<Label>Password</Label>
						<PasswordInput defaultValue="123456" />
						<Message severity="warning">This password is weak.</Message>
					</Field>
					<Field>
						<Label>Username</Label>
						<Input defaultValue="jane" />
						<Message severity="success">Username is available.</Message>
					</Field>
				</Stack>
			</Example>
		</Stack>
	)
}
