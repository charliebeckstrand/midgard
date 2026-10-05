import { CreditCardInput } from 'ui/credit-card-input'
import { Field, Label, Message } from 'ui/fieldset'

export default function Invalid() {
	return (
		<Field severity="error">
			<Label>Card number</Label>
			<CreditCardInput defaultValue="4242424242424241" />
			<Message>Enter a valid card number.</Message>
		</Field>
	)
}
