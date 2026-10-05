import { Field, Label, Message } from 'ui/fieldset'
import { PasswordInput } from 'ui/password-input'

export default function Validation() {
	return (
		<>
			<Field severity="warning">
				<Label>Password</Label>
				<PasswordInput defaultValue="password123" autoComplete="new-password" />
				<Message severity="warning">This password appears in a known data breach.</Message>
			</Field>
			<Field severity="success">
				<Label>Password</Label>
				<PasswordInput defaultValue="Tidal-Harbor-42" autoComplete="new-password" />
				<Message severity="success">This password is strong.</Message>
			</Field>
		</>
	)
}
