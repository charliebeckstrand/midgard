import { CreditCardInput } from 'ui/credit-card-input'
import { Field, Label } from 'ui/fieldset'

export default function Disabled() {
	return (
		<Field>
			<Label>Card number</Label>
			<CreditCardInput defaultValue="4242424242424242" disabled />
		</Field>
	)
}
