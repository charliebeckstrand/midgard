import { Field, Label, Message } from 'ui/fieldset'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'

export default function Severity() {
	return (
		<Stack gap="lg">
			<Field severity="error">
				<Label>Username</Label>
				<Input defaultValue="admin" />
				<Message>This username is taken.</Message>
			</Field>
			<Field severity="warning">
				<Label>Email</Label>
				<Input type="email" defaultValue="jane@gmial.com" />
				<Message severity="warning">Check the domain. Did you mean gmail.com?</Message>
			</Field>
			<Field severity="success">
				<Label>Promo code</Label>
				<Input defaultValue="SPRING25" />
				<Message severity="success">The code takes 25% off your order.</Message>
			</Field>
		</Stack>
	)
}
