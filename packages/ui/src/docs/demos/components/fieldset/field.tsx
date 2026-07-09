import { Field, Label } from '../../../../components/fieldset'
import { Input } from '../../../../components/input'
import { PasswordInput } from '../../../../components/password-input'
import { Stack } from '../../../../components/stack'
import { Example } from '../../../engine'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Severity">
				<Stack gap="lg">
					<Field severity="error" message="Enter a valid email address.">
						<Label>Email</Label>
						<Input defaultValue="not-an-email" />
					</Field>
					<Field severity="warning" message="This password is weak.">
						<Label>Password</Label>
						<PasswordInput defaultValue="123456" />
					</Field>
					<Field severity="success" message="Username is available.">
						<Label>Username</Label>
						<Input defaultValue="jane" />
					</Field>
				</Stack>
			</Example>
		</Stack>
	)
}
