import { Field, Label, Message } from 'ui/fieldset'
import { Input } from 'ui/input'

export default function Validation() {
	return (
		<>
			<Field severity="error">
				<Label>Email</Label>
				<Input type="email" defaultValue="jane@example" />
				<Message>Enter a full email address, such as jane@example.com.</Message>
			</Field>
			<Field severity="warning">
				<Label>Phone</Label>
				<Input type="tel" defaultValue="555 0100" />
				<Message severity="warning">Add a country code, such as +1.</Message>
			</Field>
			<Field severity="success">
				<Label>Username</Label>
				<Input defaultValue="jane.doe" />
				<Message severity="success">This username is available.</Message>
			</Field>
		</>
	)
}
